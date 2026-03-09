using UnityEngine;

/// <summary>
/// Sets up the underwater environment: ocean floor, lighting, fog, particles.
/// Attach to an empty GameObject — it procedurally builds the scene.
/// </summary>
public class OceanEnvironment : MonoBehaviour
{
    [Header("Ocean Floor")]
    public float floorSize = 2000f;      // Size in Unity units (nautical miles)
    public float floorDepthM = 400f;     // Ocean floor depth in meters
    public int floorSegments = 64;       // Mesh resolution

    [Header("Visuals")]
    public Color fogColor = new Color(0.02f, 0.08f, 0.12f);
    public Color deepFogColor = new Color(0.01f, 0.03f, 0.06f);
    public float fogDensity = 0.06f;
    public Color ambientColor = new Color(0.05f, 0.1f, 0.15f);

    [Header("Water Surface")]
    public float surfaceY = 0f;

    private const float DEPTH_SCALE = 50f;

    void Awake()
    {
        SetupFog();
        SetupLighting();
        CreateOceanFloor();
        CreateWaterSurface();
        CreateParticles();
    }

    void SetupFog()
    {
        RenderSettings.fog = true;
        RenderSettings.fogMode = FogMode.Exponential;
        RenderSettings.fogColor = fogColor;
        RenderSettings.fogDensity = fogDensity;

        Camera.main.backgroundColor = fogColor;
        Camera.main.farClipPlane = 200f;
        Camera.main.nearClipPlane = 0.1f;
    }

    void SetupLighting()
    {
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = ambientColor;

        // Dim directional light from above (sunlight through water)
        var lightObj = new GameObject("Sunlight");
        var light = lightObj.AddComponent<Light>();
        light.type = LightType.Directional;
        light.color = new Color(0.2f, 0.4f, 0.5f);
        light.intensity = 0.4f;
        light.transform.rotation = Quaternion.Euler(60f, -30f, 0f);
        light.shadows = LightShadows.Soft;
    }

    void CreateOceanFloor()
    {
        var floorObj = new GameObject("OceanFloor");
        var meshFilter = floorObj.AddComponent<MeshFilter>();
        var meshRenderer = floorObj.AddComponent<MeshRenderer>();

        // Generate a mesh with some height variation
        var mesh = GenerateFloorMesh(floorSize, floorSegments);
        meshFilter.mesh = mesh;

        // Dark ocean floor material
        var mat = new Material(Shader.Find("Standard"));
        mat.color = new Color(0.08f, 0.12f, 0.08f);
        mat.SetFloat("_Metallic", 0f);
        mat.SetFloat("_Glossiness", 0.1f);
        meshRenderer.material = mat;

        floorObj.transform.position = new Vector3(0f, -floorDepthM / DEPTH_SCALE, 0f);
    }

    Mesh GenerateFloorMesh(float size, int segments)
    {
        var mesh = new Mesh();
        mesh.name = "OceanFloor";

        int vertCount = (segments + 1) * (segments + 1);
        var vertices = new Vector3[vertCount];
        var uvs = new Vector2[vertCount];
        var triangles = new int[segments * segments * 6];

        float halfSize = size / 2f;
        float step = size / segments;

        for (int z = 0; z <= segments; z++)
        {
            for (int x = 0; x <= segments; x++)
            {
                int i = z * (segments + 1) + x;
                float wx = -halfSize + x * step;
                float wz = -halfSize + z * step;

                // Perlin noise for terrain variation
                float height = Mathf.PerlinNoise(wx * 0.005f + 100f, wz * 0.005f + 100f) * 2f;
                height += Mathf.PerlinNoise(wx * 0.02f, wz * 0.02f) * 0.5f;

                // Add some ridges (seamounts)
                float ridge = Mathf.PerlinNoise(wx * 0.001f + 50f, wz * 0.001f + 50f);
                if (ridge > 0.65f)
                {
                    height += (ridge - 0.65f) * 15f;
                }

                vertices[i] = new Vector3(wx, height, wz);
                uvs[i] = new Vector2((float)x / segments, (float)z / segments);
            }
        }

        int t = 0;
        for (int z = 0; z < segments; z++)
        {
            for (int x = 0; x < segments; x++)
            {
                int i = z * (segments + 1) + x;
                triangles[t++] = i;
                triangles[t++] = i + segments + 1;
                triangles[t++] = i + 1;
                triangles[t++] = i + 1;
                triangles[t++] = i + segments + 1;
                triangles[t++] = i + segments + 2;
            }
        }

        mesh.vertices = vertices;
        mesh.uv = uvs;
        mesh.triangles = triangles;
        mesh.RecalculateNormals();
        mesh.RecalculateBounds();

        return mesh;
    }

    void CreateWaterSurface()
    {
        // Semi-transparent plane at Y=0 representing the surface
        var surfaceObj = GameObject.CreatePrimitive(PrimitiveType.Plane);
        surfaceObj.name = "WaterSurface";
        surfaceObj.transform.position = new Vector3(0f, surfaceY, 0f);
        surfaceObj.transform.localScale = new Vector3(floorSize / 10f, 1f, floorSize / 10f);

        var mat = new Material(Shader.Find("Standard"));
        mat.SetFloat("_Mode", 3); // Transparent
        mat.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
        mat.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
        mat.SetInt("_ZWrite", 0);
        mat.DisableKeyword("_ALPHATEST_ON");
        mat.EnableKeyword("_ALPHABLEND_ON");
        mat.DisableKeyword("_ALPHAPREMULTIPLY_ON");
        mat.renderQueue = 3000;
        mat.color = new Color(0.1f, 0.3f, 0.4f, 0.15f);

        surfaceObj.GetComponent<Renderer>().material = mat;

        // Remove collider (don't want the sub hitting the surface plane)
        Destroy(surfaceObj.GetComponent<Collider>());
    }

    void CreateParticles()
    {
        // Floating particles (marine snow / suspended sediment)
        var particleObj = new GameObject("MarineSnow");
        particleObj.transform.SetParent(Camera.main.transform);
        particleObj.transform.localPosition = Vector3.zero;

        var ps = particleObj.AddComponent<ParticleSystem>();
        var main = ps.main;
        main.maxParticles = 200;
        main.startLifetime = 8f;
        main.startSpeed = 0.02f;
        main.startSize = 0.03f;
        main.startColor = new Color(0.6f, 0.7f, 0.6f, 0.3f);
        main.simulationSpace = ParticleSystemSimulationSpace.World;
        main.gravityModifier = -0.01f; // Slowly drift upward

        var emission = ps.emission;
        emission.rateOverTime = 30f;

        var shape = ps.shape;
        shape.shapeType = ParticleSystemShapeType.Box;
        shape.scale = new Vector3(30f, 15f, 30f);

        // Use default particle material
        var renderer = particleObj.GetComponent<ParticleSystemRenderer>();
        renderer.material = new Material(Shader.Find("Particles/Standard Unlit"));
        renderer.material.color = new Color(0.6f, 0.7f, 0.6f, 0.3f);
    }
}
