using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// Enemy submarine that follows a predefined trace path.
/// Interpolates position between trace waypoints based on elapsed game time.
/// </summary>
public class TargetSubmarine : MonoBehaviour
{
    [Header("Movement")]
    public float depthM = 180f;
    public float speedKts = 14f;

    [Header("Detection")]
    public float noiseLevel = 0.5f; // 0-1, used by sonar

    // Trace waypoints in Unity coordinates (set by GameManager)
    private List<TracePoint> trace = new List<TracePoint>();
    private float totalDurationSec = 360f; // 6 minutes default
    private float elapsedSec = 0f;
    private bool running = false;

    private const float DEPTH_SCALE = 50f;

    public struct TracePoint
    {
        public float x, z;    // Unity world coords (nautical miles)
        public float timeSec; // Time in seconds from start
    }

    public void SetTrace(List<TracePoint> points, float durationSec)
    {
        trace = points;
        totalDurationSec = durationSec;
        if (trace.Count > 0)
        {
            Vector3 pos = transform.position;
            pos.x = trace[0].x;
            pos.z = trace[0].z;
            pos.y = -depthM / DEPTH_SCALE;
            transform.position = pos;
        }
    }

    public void StartMoving()
    {
        running = true;
        elapsedSec = 0f;
    }

    public void StopMoving()
    {
        running = false;
    }

    void Update()
    {
        if (!running || trace.Count < 2) return;

        elapsedSec += Time.deltaTime;
        if (elapsedSec > totalDurationSec) elapsedSec = totalDurationSec;

        // Interpolate position along trace
        Vector3 pos = InterpolateTrace(elapsedSec);
        pos.y = -depthM / DEPTH_SCALE;
        transform.position = pos;

        // Face direction of movement
        if (elapsedSec < totalDurationSec - 0.1f)
        {
            Vector3 nextPos = InterpolateTrace(elapsedSec + 0.5f);
            Vector3 dir = nextPos - pos;
            dir.y = 0;
            if (dir.sqrMagnitude > 0.0001f)
            {
                transform.rotation = Quaternion.LookRotation(dir);
            }
        }
    }

    Vector3 InterpolateTrace(float t)
    {
        if (trace.Count == 0) return transform.position;
        if (t <= trace[0].timeSec) return new Vector3(trace[0].x, 0, trace[0].z);
        if (t >= trace[trace.Count - 1].timeSec) return new Vector3(trace[trace.Count - 1].x, 0, trace[trace.Count - 1].z);

        for (int i = 0; i < trace.Count - 1; i++)
        {
            if (t >= trace[i].timeSec && t <= trace[i + 1].timeSec)
            {
                float span = trace[i + 1].timeSec - trace[i].timeSec;
                float frac = span > 0 ? (t - trace[i].timeSec) / span : 0f;
                return new Vector3(
                    Mathf.Lerp(trace[i].x, trace[i + 1].x, frac),
                    0f,
                    Mathf.Lerp(trace[i].z, trace[i + 1].z, frac)
                );
            }
        }
        return new Vector3(trace[trace.Count - 1].x, 0, trace[trace.Count - 1].z);
    }

    /// <summary>
    /// Get the current world position.
    /// </summary>
    public Vector3 GetPosition() => transform.position;
}
