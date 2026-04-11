import {
    collection,
    addDoc,
    doc,
    setDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./firebase.js";

const API_KEY = "4404baf0bc464cc18a9b561f92e5406a";
const SAMPLE_RATE = 16000;

let socket = null;
let audioContext = null;
let mediaStream = null;
let processor = null;
let isBroadcasting = false;

// Listens to Firestore for captions to show on screen
export function listenToCaptions(roomCode, captionsArea) {
    let captionsList = document.createElement('div');
    captionsList.className = 'captions-list';
    
    let placeholder = document.createElement('div');
    placeholder.className = 'placeholder-text';
    placeholder.textContent = "Waiting for captions...";
    placeholder.style.marginTop = '1rem';
    
    let livePartial = document.createElement('div');
    livePartial.className = 'live-partial';
    livePartial.style.color = '#888';
    livePartial.style.fontStyle = 'italic';
    livePartial.style.marginTop = '1rem';
    
    captionsArea.innerHTML = '';
    captionsArea.appendChild(captionsList);
    captionsArea.appendChild(placeholder);
    captionsArea.appendChild(livePartial);

    let hasFinals = false;
    let hasPartial = false;

    const updatePlaceholder = () => {
        if (hasFinals || hasPartial) {
            placeholder.classList.add('hidden-placeholder');
        } else {
            placeholder.classList.remove('hidden-placeholder');
        }
    };

    const q = query(
        collection(db, "rooms", roomCode, "captions"),
        orderBy("createdAt", "asc")
    );

    const unsubFinals = onSnapshot(q, (snapshot) => {
        captionsList.innerHTML = '';
        hasFinals = !snapshot.empty;
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const p = document.createElement('p');
            p.textContent = data.text;
            p.style.marginBottom = '0.5rem';
            captionsList.appendChild(p);
        });
        updatePlaceholder();
        captionsArea.scrollTop = captionsArea.scrollHeight;
    });

    const unsubPartial = onSnapshot(doc(db, "rooms", roomCode, "live_caption", "current"), (docSnap) => {
        if (docSnap.exists() && docSnap.data().text) {
            livePartial.textContent = docSnap.data().text;
            hasPartial = true;
        } else {
            livePartial.textContent = "";
            hasPartial = false;
        }
        updatePlaceholder();
        captionsArea.scrollTop = captionsArea.scrollHeight;
    });

    return () => {
        unsubFinals();
        unsubPartial();
    };
}

export async function stopBroadcasting() {
    if (socket) {
        socket.close();
        socket = null;
    }
    if (processor) {
        processor.disconnect();
        processor = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    isBroadcasting = false;
}

export async function startBroadcasting(roomCode) {
    if (isBroadcasting) return;
    isBroadcasting = true;

    try {
        // Step 1 & 2: Establish WebSocket Connection to AssemblyAI (using V3 WebSocket protocol)
        // Pass the API key directly as the token parameter to bypass the need for a CORS proxy
        const params = new URLSearchParams({
            sample_rate: SAMPLE_RATE,
            speech_model: "u3-rt-pro",
            token: API_KEY
        });
        const wsUrl = `wss://streaming.assemblyai.com/v3/ws?${params.toString()}`;
        
        socket = new WebSocket(wsUrl);

        socket.onopen = async () => {
            console.log("AssemblyAI WebSocket connected.");

            // Step 3: Get Mic Access
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
            const source = audioContext.createMediaStreamSource(mediaStream);
            
            processor = audioContext.createScriptProcessor(4096, 1, 1);
            
            source.connect(processor);
            processor.connect(audioContext.destination);

            processor.onaudioprocess = (e) => {
                if (!socket || socket.readyState !== WebSocket.OPEN) return;
                
                // Downsample Float32Audio to Int16 PCM data
                const float32Data = e.inputBuffer.getChannelData(0);
                const int16Buffer = new ArrayBuffer(float32Data.length * 2);
                const view = new DataView(int16Buffer);
                
                for (let i = 0; i < float32Data.length; i++) {
                    let max = Math.max(-1, Math.min(1, float32Data[i]));
                    view.setInt16(i * 2, max < 0 ? max * 0x8000 : max * 0x7FFF, true);
                }
                
                // Send raw audio payload
                socket.send(int16Buffer);
            };
        };

        socket.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            const msgType = data.type;

            if (msgType === "Turn") {
                const transcript = data.transcript || "";
                if (!transcript.trim()) return;

                if (data.turn_is_formatted) {
                    // Final text - write to collection
                    await addDoc(collection(db, "rooms", roomCode, "captions"), {
                        text: transcript,
                        createdAt: serverTimestamp()
                    });
                    // Clear partial
                    await setDoc(doc(db, "rooms", roomCode, "live_caption", "current"), { text: "" });
                } else {
                    // Partial text - write to single doc
                    await setDoc(doc(db, "rooms", roomCode, "live_caption", "current"), { text: transcript });
                }
            } else if (msgType === "Begin") {
                console.log(`AssemblyAI Session began: ID=${data.id}`);
            } else if (msgType === "Error") {
                console.error("AssemblyAI Error:", data);
            }
        };

        socket.onerror = (err) => {
            console.error("WebSocket Error:", err);
            stopBroadcasting();
        };

        socket.onclose = () => {
            console.log("AssemblyAI WebSocket closed.");
            stopBroadcasting();
        };

    } catch (err) {
        console.error("Broadcasting failed:", err);
        stopBroadcasting();
    }
}
