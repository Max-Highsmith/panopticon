using System;
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;

/// <summary>
/// WebSocket client that connects to the Panopticon submarine bridge server.
/// Handles threading: WebSocket runs on background threads, messages are
/// marshalled to Unity's main thread via ConcurrentQueue.
/// </summary>
public class BridgeClient : MonoBehaviour
{
    [Header("Connection")]
    public string serverUrl = "ws://localhost:3002";
    public float reconnectDelaySec = 3f;

    public bool IsConnected { get; private set; }
    public event Action<string> OnMessage;

    private ClientWebSocket ws;
    private CancellationTokenSource cts;
    private readonly ConcurrentQueue<string> incomingQueue = new ConcurrentQueue<string>();
    private readonly ConcurrentQueue<string> outgoingQueue = new ConcurrentQueue<string>();
    private bool shouldReconnect = true;

    async void Start()
    {
        await ConnectLoop();
    }

    async Task ConnectLoop()
    {
        while (shouldReconnect)
        {
            try
            {
                await Connect();
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[BridgeClient] Connection failed: {e.Message}");
            }

            IsConnected = false;
            if (shouldReconnect)
            {
                Debug.Log($"[BridgeClient] Reconnecting in {reconnectDelaySec}s...");
                await Task.Delay((int)(reconnectDelaySec * 1000));
            }
        }
    }

    async Task Connect()
    {
        ws = new ClientWebSocket();
        cts = new CancellationTokenSource();

        Debug.Log($"[BridgeClient] Connecting to {serverUrl}...");
        await ws.ConnectAsync(new Uri(serverUrl), cts.Token);
        IsConnected = true;
        Debug.Log("[BridgeClient] Connected!");

        // Register as Unity client
        Send("{\"type\":\"register\",\"role\":\"unity\"}");

        // Run send and receive loops concurrently
        var receiveTask = ReceiveLoop();
        var sendTask = SendLoop();

        await Task.WhenAny(receiveTask, sendTask);

        // If one exits, cancel the other
        cts.Cancel();
    }

    async Task ReceiveLoop()
    {
        var buffer = new byte[8192];
        var messageBuffer = new StringBuilder();

        while (ws.State == WebSocketState.Open && !cts.IsCancellationRequested)
        {
            try
            {
                var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), cts.Token);

                if (result.MessageType == WebSocketMessageType.Close)
                {
                    Debug.Log("[BridgeClient] Server closed connection");
                    break;
                }

                if (result.MessageType == WebSocketMessageType.Text)
                {
                    messageBuffer.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));

                    if (result.EndOfMessage)
                    {
                        incomingQueue.Enqueue(messageBuffer.ToString());
                        messageBuffer.Clear();
                    }
                }
            }
            catch (OperationCanceledException) { break; }
            catch (Exception e)
            {
                Debug.LogError($"[BridgeClient] Receive error: {e.Message}");
                break;
            }
        }
    }

    async Task SendLoop()
    {
        while (ws.State == WebSocketState.Open && !cts.IsCancellationRequested)
        {
            while (outgoingQueue.TryDequeue(out var msg))
            {
                try
                {
                    var bytes = Encoding.UTF8.GetBytes(msg);
                    await ws.SendAsync(
                        new ArraySegment<byte>(bytes),
                        WebSocketMessageType.Text,
                        true,
                        cts.Token
                    );
                }
                catch (OperationCanceledException) { return; }
                catch (Exception e)
                {
                    Debug.LogError($"[BridgeClient] Send error: {e.Message}");
                    return;
                }
            }
            await Task.Delay(50);
        }
    }

    void Update()
    {
        // Process incoming messages on main thread
        while (incomingQueue.TryDequeue(out var msg))
        {
            OnMessage?.Invoke(msg);
        }
    }

    public void Send(string json)
    {
        outgoingQueue.Enqueue(json);
    }

    void OnDestroy()
    {
        shouldReconnect = false;
        cts?.Cancel();
        try { ws?.Dispose(); } catch { }
    }

    void OnApplicationQuit()
    {
        shouldReconnect = false;
        cts?.Cancel();
        try { ws?.Dispose(); } catch { }
    }
}
