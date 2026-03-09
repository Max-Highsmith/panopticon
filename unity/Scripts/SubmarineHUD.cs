using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// On-screen HUD showing submarine state, sonar contacts, and AI reasoning.
/// Uses OnGUI for simplicity (no Canvas setup required).
/// Styled to match Panopticon's dark theme with green accent.
/// </summary>
public class SubmarineHUD : MonoBehaviour
{
    [Header("References")]
    public SubmarineController submarine;
    public SonarSystem sonar;

    [Header("Display")]
    public bool showDebugInfo = false;

    // State
    private List<SonarContact> lastContacts = new List<SonarContact>();
    private string lastAiReasoning = "";
    private string lastAiCommand = "";
    private float lastCommandTime = 0f;
    private List<string> intelMessages = new List<string>();

    // Styles
    private GUIStyle boxStyle;
    private GUIStyle labelStyle;
    private GUIStyle headerStyle;
    private GUIStyle accentStyle;
    private GUIStyle intelStyle;
    private bool stylesInitialized = false;

    void InitStyles()
    {
        if (stylesInitialized) return;

        var bgTex = MakeTex(2, 2, new Color(0.05f, 0.08f, 0.05f, 0.85f));
        var borderTex = MakeTex(2, 2, new Color(0f, 1f, 0.25f, 0.3f));

        boxStyle = new GUIStyle(GUI.skin.box);
        boxStyle.normal.background = bgTex;
        boxStyle.padding = new RectOffset(10, 10, 8, 8);

        labelStyle = new GUIStyle(GUI.skin.label);
        labelStyle.normal.textColor = new Color(0.7f, 0.8f, 0.7f);
        labelStyle.fontSize = 13;
        labelStyle.font = Font.CreateDynamicFontFromOSFont("Courier New", 13);

        headerStyle = new GUIStyle(labelStyle);
        headerStyle.normal.textColor = new Color(0f, 1f, 0.25f);
        headerStyle.fontSize = 14;
        headerStyle.fontStyle = FontStyle.Bold;

        accentStyle = new GUIStyle(labelStyle);
        accentStyle.normal.textColor = new Color(0f, 1f, 0.25f);

        intelStyle = new GUIStyle(labelStyle);
        intelStyle.normal.textColor = new Color(1f, 0.8f, 0.2f);
        intelStyle.fontSize = 12;
        intelStyle.wordWrap = true;

        stylesInitialized = true;
    }

    Texture2D MakeTex(int w, int h, Color col)
    {
        var pixels = new Color[w * h];
        for (int i = 0; i < pixels.Length; i++) pixels[i] = col;
        var tex = new Texture2D(w, h);
        tex.SetPixels(pixels);
        tex.Apply();
        return tex;
    }

    public void UpdateContacts(List<SonarContact> contacts)
    {
        lastContacts = contacts;
    }

    public void UpdateAiCommand(string command, string reasoning)
    {
        lastAiCommand = command;
        lastAiReasoning = reasoning;
        lastCommandTime = Time.time;
    }

    public void AddIntel(string message)
    {
        intelMessages.Add(message);
        // Keep last 5
        if (intelMessages.Count > 5)
            intelMessages.RemoveAt(0);
    }

    void OnGUI()
    {
        InitStyles();
        if (submarine == null) return;

        // === LEFT PANEL: Submarine Status ===
        GUILayout.BeginArea(new Rect(10, 10, 280, 300), boxStyle);

        GUILayout.Label("SUBMARINE STATUS", headerStyle);
        GUILayout.Space(4);

        float heading = submarine.currentHeading;
        string headingDir = GetCompassDir(heading);
        GUILayout.Label($"HDG  {heading:000}° {headingDir}", accentStyle);
        GUILayout.Label($"DEP  {submarine.currentDepthM:F0}m", accentStyle);
        GUILayout.Label($"SPD  {submarine.currentSpeedKts:F1} kts", accentStyle);

        GUILayout.Space(6);
        string noiseStr = submarine.currentSpeedKts > 15 ? "HIGH" :
                         submarine.currentSpeedKts > 8 ? "MODERATE" :
                         submarine.currentSpeedKts > 3 ? "LOW" : "ULTRA-QUIET";
        Color noiseColor = submarine.currentSpeedKts > 15 ? Color.red :
                          submarine.currentSpeedKts > 8 ? Color.yellow :
                          new Color(0f, 1f, 0.25f);
        var noiseStyle = new GUIStyle(labelStyle);
        noiseStyle.normal.textColor = noiseColor;
        GUILayout.Label($"NOISE: {noiseStr}", noiseStyle);

        GUILayout.Space(6);
        GUILayout.Label($"CMD → HDG {submarine.targetHeading:000}°  DEP {submarine.targetDepthM:F0}m  SPD {submarine.targetSpeedKts:F1}kts", labelStyle);

        GUILayout.EndArea();

        // === RIGHT PANEL: Sonar Contacts ===
        GUILayout.BeginArea(new Rect(Screen.width - 320, 10, 310, 250), boxStyle);

        GUILayout.Label("SONAR CONTACTS", headerStyle);
        GUILayout.Space(4);

        if (lastContacts.Count == 0)
        {
            GUILayout.Label("No contacts detected", labelStyle);
        }
        else
        {
            foreach (var c in lastContacts)
            {
                var contactColor = new GUIStyle(labelStyle);
                contactColor.normal.textColor = c.signalStrength > 0.5f ? Color.red :
                                                c.signalStrength > 0.2f ? Color.yellow :
                                                new Color(0.6f, 0.6f, 0.6f);
                GUILayout.Label($"{c.id}", contactColor);

                string rangeStr = c.rangeNm > 0 ? $"{c.rangeNm:F1}nm" : "UNKNOWN";
                GUILayout.Label($"  BRG {c.bearing:000}°  RNG {rangeStr}  SIG {c.signalStrength:P0}", labelStyle);
                GUILayout.Label($"  {c.classification}", labelStyle);
                GUILayout.Space(4);

                if (showDebugInfo)
                {
                    var debugStyle = new GUIStyle(labelStyle);
                    debugStyle.normal.textColor = Color.gray;
                    debugStyle.fontSize = 11;
                    GUILayout.Label($"  [DEBUG] Actual dist: {c.actualDistNm:F1}nm", debugStyle);
                }
            }
        }

        GUILayout.EndArea();

        // === BOTTOM LEFT: AI Reasoning ===
        if (!string.IsNullOrEmpty(lastAiReasoning))
        {
            float timeSinceCmd = Time.time - lastCommandTime;
            float alpha = timeSinceCmd < 5f ? 1f : Mathf.Max(0.3f, 1f - (timeSinceCmd - 5f) * 0.1f);

            GUILayout.BeginArea(new Rect(10, Screen.height - 120, 500, 100), boxStyle);
            GUILayout.Label("AI CAPTAIN", headerStyle);
            var reasonStyle = new GUIStyle(labelStyle);
            reasonStyle.wordWrap = true;
            reasonStyle.normal.textColor = new Color(0.8f, 0.9f, 0.8f, alpha);
            GUILayout.Label(lastAiReasoning, reasonStyle);
            GUILayout.EndArea();
        }

        // === BOTTOM RIGHT: Intel Feed ===
        if (intelMessages.Count > 0)
        {
            float intelHeight = 30 + intelMessages.Count * 45;
            GUILayout.BeginArea(new Rect(Screen.width - 420, Screen.height - intelHeight - 10, 410, intelHeight), boxStyle);
            GUILayout.Label("INTEL FEED", headerStyle);
            foreach (var msg in intelMessages)
            {
                GUILayout.Label(msg, intelStyle);
                GUILayout.Space(2);
            }
            GUILayout.EndArea();
        }

        // === TOP CENTER: Compass ===
        DrawCompass();
    }

    void DrawCompass()
    {
        if (submarine == null) return;
        float cx = Screen.width / 2f;
        float cy = 40f;

        GUI.Label(new Rect(cx - 30, cy - 15, 60, 30), $"{submarine.currentHeading:000}°", headerStyle);
    }

    string GetCompassDir(float heading)
    {
        if (heading < 22.5f || heading >= 337.5f) return "N";
        if (heading < 67.5f) return "NE";
        if (heading < 112.5f) return "E";
        if (heading < 157.5f) return "SE";
        if (heading < 202.5f) return "S";
        if (heading < 247.5f) return "SW";
        if (heading < 292.5f) return "W";
        return "NW";
    }
}
