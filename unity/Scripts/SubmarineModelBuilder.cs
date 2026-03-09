using UnityEngine;

/// <summary>
/// Procedurally creates a submarine model from Unity primitives.
/// No external assets required — just capsules, cylinders, and cubes.
/// Returns a GameObject hierarchy:
///   SubRoot
///     Hull (capsule)
///     ConningTower (cube)
///     Rudder (cube)
///     Propeller (cylinder)
///     BowPlanes (cube x2)
/// </summary>
public static class SubmarineModelBuilder
{
    public static GameObject CreateSubmarine(string name, Color hullColor)
    {
        var root = new GameObject(name);

        // === Hull (stretched capsule) ===
        var hull = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        hull.name = "Hull";
        hull.transform.SetParent(root.transform);
        hull.transform.localPosition = Vector3.zero;
        hull.transform.localRotation = Quaternion.Euler(0f, 0f, 90f); // Lay on side
        hull.transform.localScale = new Vector3(0.6f, 1.8f, 0.6f);   // Long and thin

        var hullMat = new Material(Shader.Find("Standard"));
        hullMat.color = hullColor;
        hullMat.SetFloat("_Metallic", 0.6f);
        hullMat.SetFloat("_Glossiness", 0.4f);
        hull.GetComponent<Renderer>().material = hullMat;

        // Remove individual colliders, add one to root
        Object.Destroy(hull.GetComponent<Collider>());

        // === Conning Tower (sail) ===
        var sail = GameObject.CreatePrimitive(PrimitiveType.Cube);
        sail.name = "Sail";
        sail.transform.SetParent(root.transform);
        sail.transform.localPosition = new Vector3(0f, 0.35f, 0.3f);
        sail.transform.localScale = new Vector3(0.12f, 0.35f, 0.5f);

        var sailMat = new Material(Shader.Find("Standard"));
        sailMat.color = hullColor * 0.8f;
        sailMat.SetFloat("_Metallic", 0.5f);
        sailMat.SetFloat("_Glossiness", 0.3f);
        sail.GetComponent<Renderer>().material = sailMat;
        Object.Destroy(sail.GetComponent<Collider>());

        // Periscope / mast on top of sail
        var mast = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        mast.name = "Mast";
        mast.transform.SetParent(sail.transform);
        mast.transform.localPosition = new Vector3(0f, 0.7f, 0.1f);
        mast.transform.localScale = new Vector3(0.08f, 0.3f, 0.08f);
        mast.GetComponent<Renderer>().material = sailMat;
        Object.Destroy(mast.GetComponent<Collider>());

        // === Stern / Rudder ===
        var rudder = GameObject.CreatePrimitive(PrimitiveType.Cube);
        rudder.name = "Rudder";
        rudder.transform.SetParent(root.transform);
        rudder.transform.localPosition = new Vector3(0f, 0f, -1.7f);
        rudder.transform.localScale = new Vector3(0.04f, 0.4f, 0.25f);

        rudder.GetComponent<Renderer>().material = sailMat;
        Object.Destroy(rudder.GetComponent<Collider>());

        // Horizontal stabilizers
        var hStab = GameObject.CreatePrimitive(PrimitiveType.Cube);
        hStab.name = "HorizontalStab";
        hStab.transform.SetParent(root.transform);
        hStab.transform.localPosition = new Vector3(0f, 0f, -1.65f);
        hStab.transform.localScale = new Vector3(0.5f, 0.04f, 0.2f);
        hStab.GetComponent<Renderer>().material = sailMat;
        Object.Destroy(hStab.GetComponent<Collider>());

        // === Propeller ===
        var prop = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        prop.name = "Propeller";
        prop.transform.SetParent(root.transform);
        prop.transform.localPosition = new Vector3(0f, 0f, -1.9f);
        prop.transform.localScale = new Vector3(0.3f, 0.02f, 0.3f);
        prop.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);

        var propMat = new Material(Shader.Find("Standard"));
        propMat.color = new Color(0.3f, 0.3f, 0.3f);
        propMat.SetFloat("_Metallic", 0.8f);
        prop.GetComponent<Renderer>().material = propMat;
        Object.Destroy(prop.GetComponent<Collider>());

        // === Bow Planes (dive planes) ===
        for (int side = -1; side <= 1; side += 2)
        {
            var plane = GameObject.CreatePrimitive(PrimitiveType.Cube);
            plane.name = side > 0 ? "BowPlaneRight" : "BowPlaneLeft";
            plane.transform.SetParent(root.transform);
            plane.transform.localPosition = new Vector3(side * 0.25f, 0f, 1.3f);
            plane.transform.localScale = new Vector3(0.25f, 0.04f, 0.15f);
            plane.GetComponent<Renderer>().material = sailMat;
            Object.Destroy(plane.GetComponent<Collider>());
        }

        // === Root collider (simplified box) ===
        var boxCol = root.AddComponent<BoxCollider>();
        boxCol.center = Vector3.zero;
        boxCol.size = new Vector3(0.6f, 0.6f, 3.6f);

        // Scale up the whole thing for visibility
        // At 1 unit = 1 nautical mile, a real sub would be invisible
        // Scale to ~3 units for gameplay visibility
        root.transform.localScale = Vector3.one * 1.5f;

        return root;
    }
}
