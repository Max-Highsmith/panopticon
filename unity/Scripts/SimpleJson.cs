using System.Collections.Generic;

/// <summary>
/// Minimal JSON parser for Unity — no external dependencies.
/// Handles the subset of JSON needed for bridge communication:
/// objects, arrays, strings, numbers, booleans.
/// Not a full JSON parser — just enough for structured messages.
/// </summary>
public class SimpleJson
{
    private Dictionary<string, object> data;

    private SimpleJson(Dictionary<string, object> data)
    {
        this.data = data;
    }

    public static SimpleJson Parse(string json)
    {
        int index = 0;
        var obj = ParseObject(json, ref index);
        return new SimpleJson(obj);
    }

    public string GetString(string key)
    {
        if (data.TryGetValue(key, out var val) && val is string s)
            return s;
        return "";
    }

    public float GetFloat(string key, float defaultVal = 0f)
    {
        if (data.TryGetValue(key, out var val))
        {
            if (val is double d) return (float)d;
            if (val is string s && float.TryParse(s, out float f)) return f;
        }
        return defaultVal;
    }

    public bool GetBool(string key, bool defaultVal = false)
    {
        if (data.TryGetValue(key, out var val))
        {
            if (val is bool b) return b;
        }
        return defaultVal;
    }

    public List<SimpleJson> GetArray(string key)
    {
        if (data.TryGetValue(key, out var val) && val is List<object> arr)
        {
            var result = new List<SimpleJson>();
            foreach (var item in arr)
            {
                if (item is Dictionary<string, object> dict)
                    result.Add(new SimpleJson(dict));
            }
            return result;
        }
        return null;
    }

    public SimpleJson GetObject(string key)
    {
        if (data.TryGetValue(key, out var val) && val is Dictionary<string, object> dict)
            return new SimpleJson(dict);
        return null;
    }

    // ========== Parser ==========

    static void SkipWhitespace(string json, ref int i)
    {
        while (i < json.Length && char.IsWhiteSpace(json[i])) i++;
    }

    static Dictionary<string, object> ParseObject(string json, ref int i)
    {
        var dict = new Dictionary<string, object>();
        SkipWhitespace(json, ref i);
        if (i >= json.Length || json[i] != '{') return dict;
        i++; // skip {

        while (i < json.Length)
        {
            SkipWhitespace(json, ref i);
            if (i >= json.Length || json[i] == '}') { i++; break; }
            if (json[i] == ',') { i++; continue; }

            string key = ParseString(json, ref i);
            SkipWhitespace(json, ref i);
            if (i < json.Length && json[i] == ':') i++;
            SkipWhitespace(json, ref i);

            object value = ParseValue(json, ref i);
            dict[key] = value;
        }

        return dict;
    }

    static List<object> ParseArray(string json, ref int i)
    {
        var list = new List<object>();
        i++; // skip [

        while (i < json.Length)
        {
            SkipWhitespace(json, ref i);
            if (i >= json.Length || json[i] == ']') { i++; break; }
            if (json[i] == ',') { i++; continue; }

            list.Add(ParseValue(json, ref i));
        }

        return list;
    }

    static object ParseValue(string json, ref int i)
    {
        SkipWhitespace(json, ref i);
        if (i >= json.Length) return null;

        char c = json[i];
        if (c == '"') return ParseString(json, ref i);
        if (c == '{') return ParseObject(json, ref i);
        if (c == '[') return ParseArray(json, ref i);
        if (c == 't') { i += 4; return true; }
        if (c == 'f') { i += 5; return false; }
        if (c == 'n') { i += 4; return null; }
        if (c == '-' || char.IsDigit(c)) return ParseNumber(json, ref i);

        return null;
    }

    static string ParseString(string json, ref int i)
    {
        if (i >= json.Length || json[i] != '"') return "";
        i++; // skip opening quote

        var sb = new System.Text.StringBuilder();
        while (i < json.Length && json[i] != '"')
        {
            if (json[i] == '\\' && i + 1 < json.Length)
            {
                i++;
                switch (json[i])
                {
                    case '"': sb.Append('"'); break;
                    case '\\': sb.Append('\\'); break;
                    case '/': sb.Append('/'); break;
                    case 'n': sb.Append('\n'); break;
                    case 'r': sb.Append('\r'); break;
                    case 't': sb.Append('\t'); break;
                    default: sb.Append(json[i]); break;
                }
            }
            else
            {
                sb.Append(json[i]);
            }
            i++;
        }
        if (i < json.Length) i++; // skip closing quote

        return sb.ToString();
    }

    static double ParseNumber(string json, ref int i)
    {
        int start = i;
        if (json[i] == '-') i++;
        while (i < json.Length && (char.IsDigit(json[i]) || json[i] == '.' || json[i] == 'e' || json[i] == 'E' || json[i] == '+' || json[i] == '-'))
        {
            // Avoid double minus (only at start)
            if ((json[i] == '-' || json[i] == '+') && i > start + 1 && json[i - 1] != 'e' && json[i - 1] != 'E')
                break;
            i++;
        }
        string numStr = json.Substring(start, i - start);
        if (double.TryParse(numStr, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out double result))
            return result;
        return 0;
    }
}
