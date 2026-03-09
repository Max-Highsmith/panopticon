using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// Main orchestrator for the submarine pursuit game.
/// Procedurally builds the entire scene — just attach to an empty GameObject.
///
/// Flow:
///   1. Creates ocean environment, submarines, camera, HUD
///   2. Connects to bridge server via WebSocket
///   3. Sends submarine state every stateUpdateInterval seconds
///   4. Receives AI navigation commands and applies them
///   5. Intel feed messages appear as they're revealed by the server
/// </summary>
public class GameManager : MonoBehaviour
{
    [Header("Bridge Server")]
    public string bridgeServerUrl = "ws://localhost:3002";
    public float stateUpdateInterval = 2f;

    [Header("Game Settings")]
    public bool autoStart = true;
    public bool showDebugInfo = false;

    [Header("Starting Position")]
    // Default: P-8 starting position from scenario, converted to Unity coords
    // Ref: lat 55, lon -28. Blue start: lat 58, lon -32
    // Z = (58-55)*60 = 180, X = (-32-(-28))*34.4 = -137.6
    public Vector3 playerStartPos = new Vector3(-137.6f, -2f, 180f);
    public float playerStartHeading = 150f;
    public float playerStartDepth = 100f;

    // References (created at runtime)
    private SubmarineController playerSub;
    private TargetSubmarine targetSub;
    private SonarSystem sonarSystem;
    private SubmarineHUD hud;
    private BridgeClient bridge;
    private SubmarineCamera cam;

    // Coordinate mapping (set by bridge config or defaults)
    private float refLat = 55f;
    private float refLon = -28f;
    private float nmPerDegLat = 60f;
    private float nmPerDegLon = 34.4f;

    // State
    private float lastStateUpdate = 0f;
    private bool gameRunning = false;

    void Start()
    {
        // Build the entire scene
        BuildScene();

        // Connect to bridge
        SetupBridge();

        if (autoStart)
        {
            Invoke(nameof(StartGame), 2f); // Wait for connection
        }
    }

    void BuildScene()
    {
        // --- Ocean Environment ---
        var envObj = new GameObject("Environment");
        envObj.AddComponent<OceanEnvironment>();

        // --- Player Submarine ---
        var playerObj = SubmarineModelBuilder.CreateSubmarine("PlayerSub", new Color(0.2f, 0.5f, 0.3f));
        playerObj.transform.position = playerStartPos;

        playerSub = playerObj.AddComponent<SubmarineController>();
        playerSub.targetHeading = playerStartHeading;
        playerSub.targetDepthM = playerStartDepth;
        playerSub.maxSpeedKts = 30f;

        sonarSystem = playerObj.AddComponent<SonarSystem>();

        // --- Target Submarine ---
        var targetObj = SubmarineModelBuilder.CreateSubmarine("TargetSub", new Color(0.6f, 0.15f, 0.1f));
        targetSub = targetObj.AddComponent<TargetSubmarine>();

        // Default trace from scenario (converted to Unity coords)
        // GOBLIN ONE: (55,-26) → (54,-24) → (52.5,-21.5) → (51,-19)
        var defaultTrace = new List<TargetSubmarine.TracePoint>
        {
            new TargetSubmarine.TracePoint { x = LatLonToX(-26f), z = LatLonToZ(55f), timeSec = 0f },
            new TargetSubmarine.TracePoint { x = LatLonToX(-24f), z = LatLonToZ(54f), timeSec = 120f },
            new TargetSubmarine.TracePoint { x = LatLonToX(-21.5f), z = LatLonToZ(52.5f), timeSec = 240f },
            new TargetSubmarine.TracePoint { x = LatLonToX(-19f), z = LatLonToZ(51f), timeSec = 360f },
        };
        targetSub.SetTrace(defaultTrace, 360f);

        // --- Camera ---
        var camObj = Camera.main.gameObject;
        cam = camObj.AddComponent<SubmarineCamera>();
        cam.target = playerObj.transform;

        // --- HUD ---
        hud = camObj.AddComponent<SubmarineHUD>();
        hud.submarine = playerSub;
        hud.sonar = sonarSystem;
        hud.showDebugInfo = showDebugInfo;

        // --- Point light on player sub (subtle green glow) ---
        var subLight = new GameObject("SubLight");
        subLight.transform.SetParent(playerObj.transform);
        subLight.transform.localPosition = new Vector3(0f, 0.3f, 0.8f);
        var light = subLight.AddComponent<Light>();
        light.type = LightType.Point;
        light.color = new Color(0.3f, 0.8f, 0.4f);
        light.intensity = 0.5f;
        light.range = 10f;
    }

    void SetupBridge()
    {
        var bridgeObj = new GameObject("BridgeClient");
        bridge = bridgeObj.AddComponent<BridgeClient>();
        bridge.serverUrl = bridgeServerUrl;
        bridge.OnMessage += HandleBridgeMessage;
    }

    void StartGame()
    {
        gameRunning = true;
        targetSub.StartMoving();

        if (bridge.IsConnected)
        {
            bridge.Send("{\"type\":\"start\"}");
            Debug.Log("[GameManager] Game started, bridge connected");
        }
        else
        {
            Debug.LogWarning("[GameManager] Game started but bridge not connected — AI won't control sub");
        }
    }

    void Update()
    {
        if (!gameRunning) return;

        // Periodic sonar scan + state update
        if (Time.time - lastStateUpdate >= stateUpdateInterval)
        {
            lastStateUpdate = Time.time;

            // Run sonar
            var contacts = sonarSystem.Scan();
            hud.UpdateContacts(contacts);

            // Send state to bridge
            if (bridge.IsConnected)
            {
                SendState(contacts);
            }
        }

        // Keyboard controls for manual override / testing
        HandleKeyboard();
    }

    void SendState(List<SonarContact> contacts)
    {
        var sub = playerSub;
        float lat = refLat + sub.transform.position.z / nmPerDegLat;
        float lon = refLon + sub.transform.position.x / nmPerDegLon;

        // Build contacts JSON array
        string contactsJson = "[";
        for (int i = 0; i < contacts.Count; i++)
        {
            if (i > 0) contactsJson += ",";
            var c = contacts[i];
            contactsJson += $"{{\"id\":\"{c.id}\",\"bearing\":{c.bearing:F1},\"range_nm\":{c.rangeNm:F1},\"signal_strength\":{c.signalStrength:F2},\"classification\":\"{c.classification}\"}}";
        }
        contactsJson += "]";

        string json = $"{{\"type\":\"state\",\"submarine\":{{\"lat\":{lat:F4},\"lon\":{lon:F4},\"depth_m\":{sub.currentDepthM:F0},\"heading\":{sub.currentHeading:F0},\"speed_kts\":{sub.currentSpeedKts:F1}}},\"contacts\":{contactsJson}}}";

        bridge.Send(json);
    }

    void HandleBridgeMessage(string json)
    {
        try
        {
            // Minimal JSON parsing without external dependencies
            var msg = SimpleJson.Parse(json);
            string type = msg.GetString("type");

            switch (type)
            {
                case "config":
                    // Update coordinate mapping from server
                    refLat = msg.GetFloat("refLat", 55f);
                    refLon = msg.GetFloat("refLon", -28f);
                    nmPerDegLat = msg.GetFloat("nmPerDegLat", 60f);
                    nmPerDegLon = msg.GetFloat("nmPerDegLon", 34.4f);
                    Debug.Log($"[GameManager] Config received: ref {refLat}N {refLon}E, scale {nmPerDegLat}/{nmPerDegLon}");

                    // Update target trace if provided
                    var trace = msg.GetArray("targetTrace");
                    if (trace != null && trace.Count > 0)
                    {
                        var tracePoints = new List<TargetSubmarine.TracePoint>();
                        float totalDuration = trace.Count * 30f; // 30s per tick
                        foreach (var point in trace)
                        {
                            float tick = point.GetFloat("tick", 0f);
                            float lat = point.GetFloat("lat", 55f);
                            float lon = point.GetFloat("lon", -28f);
                            tracePoints.Add(new TargetSubmarine.TracePoint
                            {
                                x = (lon - refLon) * nmPerDegLon,
                                z = (lat - refLat) * nmPerDegLat,
                                timeSec = tick * 30f,
                            });
                        }
                        targetSub.SetTrace(tracePoints, totalDuration);
                    }

                    // Update player start position if provided
                    var blueStart = msg.GetObject("blueStart");
                    if (blueStart != null)
                    {
                        float startLat = blueStart.GetFloat("lat", 58f);
                        float startLon = blueStart.GetFloat("lon", -32f);
                        playerStartPos = new Vector3(
                            (startLon - refLon) * nmPerDegLon,
                            -playerStartDepth / 50f,
                            (startLat - refLat) * nmPerDegLat
                        );
                        playerSub.transform.position = playerStartPos;
                    }
                    break;

                case "command":
                    float heading = msg.GetFloat("heading", playerSub.targetHeading);
                    float depth = msg.GetFloat("target_depth_m", playerSub.targetDepthM);
                    float speed = msg.GetFloat("speed_kts", playerSub.targetSpeedKts);
                    string reasoning = msg.GetString("reasoning");

                    playerSub.ApplyCommand(heading, depth, speed);
                    sonarSystem.activeSonarOn = msg.GetBool("active_sonar", false);

                    hud.UpdateAiCommand(
                        $"HDG {heading:000} DEP {depth}m SPD {speed}kts",
                        reasoning
                    );
                    Debug.Log($"[GameManager] AI Command: HDG {heading} DEP {depth}m SPD {speed}kts — {reasoning}");
                    break;

                case "intel":
                    string intelMsg = msg.GetString("message");
                    if (!string.IsNullOrEmpty(intelMsg))
                    {
                        hud.AddIntel(intelMsg);
                        Debug.Log($"[GameManager] Intel: {intelMsg.Substring(0, Mathf.Min(60, intelMsg.Length))}...");
                    }
                    break;

                case "game_start":
                    Debug.Log("[GameManager] Game started (confirmed by server)");
                    break;

                case "game_stop":
                    gameRunning = false;
                    Debug.Log("[GameManager] Game stopped by server");
                    break;
            }
        }
        catch (System.Exception e)
        {
            Debug.LogError($"[GameManager] Failed to parse message: {e.Message}");
        }
    }

    void HandleKeyboard()
    {
        // Manual controls for testing without the bridge server
        // WASD for heading/speed, QE for depth
        if (Input.GetKey(KeyCode.W)) playerSub.targetSpeedKts = Mathf.Min(playerSub.targetSpeedKts + 5f * Time.deltaTime, 30f);
        if (Input.GetKey(KeyCode.S)) playerSub.targetSpeedKts = Mathf.Max(playerSub.targetSpeedKts - 5f * Time.deltaTime, 0f);
        if (Input.GetKey(KeyCode.A)) playerSub.targetHeading -= 30f * Time.deltaTime;
        if (Input.GetKey(KeyCode.D)) playerSub.targetHeading += 30f * Time.deltaTime;
        if (Input.GetKey(KeyCode.Q)) playerSub.targetDepthM = Mathf.Max(playerSub.targetDepthM - 20f * Time.deltaTime, 30f);
        if (Input.GetKey(KeyCode.E)) playerSub.targetDepthM = Mathf.Min(playerSub.targetDepthM + 20f * Time.deltaTime, 500f);

        // Toggle debug
        if (Input.GetKeyDown(KeyCode.F1)) hud.showDebugInfo = !hud.showDebugInfo;

        // Toggle active sonar
        if (Input.GetKeyDown(KeyCode.Space))
        {
            sonarSystem.activeSonarOn = !sonarSystem.activeSonarOn;
            Debug.Log($"Active sonar: {(sonarSystem.activeSonarOn ? "ON" : "OFF")}");
        }
    }

    // Coordinate helpers
    float LatLonToX(float lon) => (lon - refLon) * nmPerDegLon;
    float LatLonToZ(float lat) => (lat - refLat) * nmPerDegLat;
}
