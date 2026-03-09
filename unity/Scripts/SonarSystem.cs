using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// Passive sonar system. Detects TargetSubmarine instances within range.
/// Returns bearing, estimated range, and signal strength.
/// Signal strength is affected by:
///   - Distance (inverse square)
///   - Target noise level (faster = louder)
///   - Own noise level (faster = harder to hear)
///   - Depth layer effects (simplified thermocline model)
/// </summary>
public class SonarSystem : MonoBehaviour
{
    [Header("Sonar Parameters")]
    public float maxPassiveRangeNm = 60f;  // Max passive detection range in nautical miles
    public float maxActiveRangeNm = 20f;   // Max active sonar range
    public bool activeSonarOn = false;

    [Header("Detection")]
    public float detectionThreshold = 0.05f; // Min signal strength to register

    private SubmarineController ownSub;

    void Start()
    {
        ownSub = GetComponent<SubmarineController>();
    }

    /// <summary>
    /// Scan for all TargetSubmarine objects and return detected contacts.
    /// </summary>
    public List<SonarContact> Scan()
    {
        var contacts = new List<SonarContact>();
        var targets = FindObjectsByType<TargetSubmarine>(FindObjectsSortMode.None);

        float ownNoise = ownSub != null ? ownSub.GetNoiseLevel() : 0.5f;

        foreach (var target in targets)
        {
            var contact = EvaluateContact(target, ownNoise);
            if (contact != null)
            {
                contacts.Add(contact);
            }
        }

        return contacts;
    }

    SonarContact EvaluateContact(TargetSubmarine target, float ownNoise)
    {
        Vector3 myPos = transform.position;
        Vector3 tgtPos = target.GetPosition();

        // Distance in Unity units (= nautical miles)
        float dx = tgtPos.x - myPos.x;
        float dz = tgtPos.z - myPos.z;
        float distNm = Mathf.Sqrt(dx * dx + dz * dz);

        // Bearing from own sub to target (0 = north, clockwise)
        float bearingRad = Mathf.Atan2(dx, dz);
        float bearingDeg = bearingRad * Mathf.Rad2Deg;
        bearingDeg = (bearingDeg + 360f) % 360f;

        float signalStrength = 0f;
        float rangeAccuracy = 0f; // 0 = unknown, 1 = exact

        if (activeSonarOn && distNm <= maxActiveRangeNm)
        {
            // Active sonar: strong signal, precise range, but reveals position
            signalStrength = 1f - (distNm / maxActiveRangeNm);
            rangeAccuracy = 0.9f;
        }
        else if (distNm <= maxPassiveRangeNm)
        {
            // Passive sonar: depends on target noise and own noise
            float distFactor = 1f - (distNm / maxPassiveRangeNm);
            distFactor = distFactor * distFactor; // Inverse square-ish

            float targetNoiseFactor = target.noiseLevel;
            float ownNoisePenalty = 1f - (ownNoise * 0.6f); // Own noise reduces hearing

            // Thermocline effect: if sub and target are on different sides of 200m, reduce signal
            float ownDepth = ownSub != null ? ownSub.currentDepthM : 100f;
            float tgtDepth = target.depthM;
            float thermoclinePenalty = 1f;
            if ((ownDepth < 200f && tgtDepth > 200f) || (ownDepth > 200f && tgtDepth < 200f))
            {
                thermoclinePenalty = 0.4f; // Thermocline blocks 60% of signal
            }

            signalStrength = distFactor * targetNoiseFactor * ownNoisePenalty * thermoclinePenalty;

            // Passive sonar gives poor range estimates
            rangeAccuracy = signalStrength > 0.5f ? 0.3f : 0.1f;
        }

        if (signalStrength < detectionThreshold) return null;

        // Add noise to bearing based on signal strength
        float bearingNoise = (1f - signalStrength) * 8f; // Up to ±8° error
        float noisyBearing = bearingDeg + Random.Range(-bearingNoise, bearingNoise);
        noisyBearing = (noisyBearing + 360f) % 360f;

        // Estimate range with noise
        float estimatedRange = -1f; // -1 = unknown
        if (rangeAccuracy > 0.2f)
        {
            float rangeNoise = distNm * (1f - rangeAccuracy);
            estimatedRange = distNm + Random.Range(-rangeNoise, rangeNoise);
            estimatedRange = Mathf.Max(0.5f, estimatedRange);
        }

        return new SonarContact
        {
            id = "GOBLIN ONE",
            bearing = noisyBearing,
            rangeNm = estimatedRange,
            signalStrength = signalStrength,
            classification = ClassifySignal(signalStrength, distNm),
            actualDistNm = distNm, // for debug display
        };
    }

    string ClassifySignal(float signal, float dist)
    {
        if (signal > 0.7f) return "Submarine — high confidence";
        if (signal > 0.4f) return "Probable submarine";
        if (signal > 0.2f) return "Submerged contact — unclassified";
        return "Possible contact — very weak";
    }
}

[System.Serializable]
public class SonarContact
{
    public string id;
    public float bearing;
    public float rangeNm;
    public float signalStrength;
    public string classification;
    public float actualDistNm; // debug only
}
