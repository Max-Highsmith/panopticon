using UnityEngine;

/// <summary>
/// Third-person camera that follows the player submarine.
/// Provides smooth tracking with orbit controls.
/// </summary>
public class SubmarineCamera : MonoBehaviour
{
    [Header("Target")]
    public Transform target;

    [Header("Follow Settings")]
    public float distance = 8f;
    public float height = 3f;
    public float smoothSpeed = 5f;
    public float rotationSmooth = 3f;

    [Header("Orbit (mouse control)")]
    public float orbitSensitivity = 3f;
    public float zoomSensitivity = 2f;
    public float minDistance = 3f;
    public float maxDistance = 50f;

    private float orbitAngle = 0f;  // Horizontal orbit offset
    private float orbitPitch = 15f; // Vertical angle
    private bool orbiting = false;

    void LateUpdate()
    {
        if (target == null) return;

        // Mouse orbit
        if (Input.GetMouseButton(1)) // Right-click drag
        {
            orbiting = true;
            orbitAngle += Input.GetAxis("Mouse X") * orbitSensitivity;
            orbitPitch -= Input.GetAxis("Mouse Y") * orbitSensitivity;
            orbitPitch = Mathf.Clamp(orbitPitch, -30f, 60f);
        }
        else if (orbiting && !Input.GetMouseButton(1))
        {
            // Slowly return to behind-sub view
            orbitAngle = Mathf.Lerp(orbitAngle, 0f, Time.deltaTime * 1f);
            if (Mathf.Abs(orbitAngle) < 0.5f) { orbitAngle = 0f; orbiting = false; }
        }

        // Scroll zoom
        float scroll = Input.GetAxis("Mouse ScrollWheel");
        if (scroll != 0)
        {
            distance -= scroll * zoomSensitivity * distance;
            distance = Mathf.Clamp(distance, minDistance, maxDistance);
        }

        // Calculate desired position
        float subHeading = target.eulerAngles.y;
        float camAngle = subHeading + 180f + orbitAngle; // Behind the sub
        float camPitch = orbitPitch;

        Quaternion rotation = Quaternion.Euler(camPitch, camAngle, 0f);
        Vector3 offset = rotation * Vector3.forward * -distance;
        offset.y += height;

        Vector3 desiredPos = target.position + offset;
        transform.position = Vector3.Lerp(transform.position, desiredPos, smoothSpeed * Time.deltaTime);

        // Look at submarine
        Quaternion desiredRot = Quaternion.LookRotation(target.position - transform.position);
        transform.rotation = Quaternion.Slerp(transform.rotation, desiredRot, rotationSmooth * Time.deltaTime);
    }
}
