using UnityEngine;

/// <summary>
/// Physics-based submarine movement controller.
/// Smoothly interpolates toward target heading, depth, and speed.
/// Coordinate system: X = East, Y = Up (negative = depth), Z = North.
/// 1 Unity unit = 1 nautical mile.
/// </summary>
public class SubmarineController : MonoBehaviour
{
    [Header("Command Targets (set by AI)")]
    public float targetHeading = 0f;
    public float targetDepthM = 100f;
    public float targetSpeedKts = 0f;

    [Header("Limits")]
    public float maxSpeedKts = 30f;
    public float maxDepthM = 500f;
    public float minDepthM = 30f;

    [Header("Response Rates")]
    public float turnRateDegPerSec = 12f;
    public float depthRateMPerSec = 3f;
    public float accelRateKtsPerSec = 1.5f;

    [Header("Current State (read-only)")]
    public float currentHeading;
    public float currentDepthM;
    public float currentSpeedKts;

    // Depth scale: 1 Unity Y unit = this many meters
    // At 500m max depth, sub is at Y = -500/DEPTH_SCALE
    private const float DEPTH_SCALE = 50f; // 1 unit = 50m, so 500m = 10 units deep

    // Speed: 1 knot = 1 nm/hour. At 30 kts, sub moves 30 nm/hour = 0.5 nm/min
    // In Unity: 30 kts = 30 units/3600s = 0.00833 units/frame at 60fps
    private const float KTS_TO_UNITS_PER_SEC = 1f / 3600f; // 1 nm/hr → nm/s

    void Start()
    {
        currentHeading = targetHeading;
        currentDepthM = targetDepthM;
        currentSpeedKts = 0f;
        ApplyTransform();
    }

    void Update()
    {
        float dt = Time.deltaTime;

        // Smooth heading
        float headingDiff = Mathf.DeltaAngle(currentHeading, targetHeading);
        float maxTurn = turnRateDegPerSec * dt;
        currentHeading += Mathf.Clamp(headingDiff, -maxTurn, maxTurn);
        currentHeading = (currentHeading % 360f + 360f) % 360f;

        // Smooth depth
        float clampedTargetDepth = Mathf.Clamp(targetDepthM, minDepthM, maxDepthM);
        float depthDiff = clampedTargetDepth - currentDepthM;
        float maxDepthChange = depthRateMPerSec * dt;
        currentDepthM += Mathf.Clamp(depthDiff, -maxDepthChange, maxDepthChange);

        // Smooth speed
        float clampedTargetSpeed = Mathf.Clamp(targetSpeedKts, 0f, maxSpeedKts);
        float speedDiff = clampedTargetSpeed - currentSpeedKts;
        float maxAccel = accelRateKtsPerSec * dt;
        currentSpeedKts += Mathf.Clamp(speedDiff, -maxAccel, maxAccel);
        currentSpeedKts = Mathf.Max(0f, currentSpeedKts);

        // Move forward
        float unitsPerSec = currentSpeedKts * KTS_TO_UNITS_PER_SEC;
        Vector3 forward = Quaternion.Euler(0f, currentHeading, 0f) * Vector3.forward;
        transform.position += forward * unitsPerSec * dt;

        ApplyTransform();
    }

    void ApplyTransform()
    {
        // Apply depth
        Vector3 pos = transform.position;
        pos.y = -currentDepthM / DEPTH_SCALE;
        transform.position = pos;

        // Apply rotation — heading + slight pitch when changing depth
        float pitchTarget = (targetDepthM - currentDepthM) * 0.1f;
        pitchTarget = Mathf.Clamp(pitchTarget, -15f, 15f);
        transform.rotation = Quaternion.Euler(pitchTarget, currentHeading, 0f);
    }

    /// <summary>
    /// Apply a navigation command from the bridge server.
    /// </summary>
    public void ApplyCommand(float heading, float depthM, float speedKts)
    {
        targetHeading = heading;
        targetDepthM = depthM;
        targetSpeedKts = speedKts;
    }

    /// <summary>
    /// Get the current noise level (0-1) based on speed.
    /// </summary>
    public float GetNoiseLevel()
    {
        if (currentSpeedKts <= 3f) return 0.1f;
        if (currentSpeedKts <= 8f) return 0.3f;
        if (currentSpeedKts <= 15f) return 0.6f;
        return 0.9f;
    }
}
