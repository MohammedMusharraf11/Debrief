"use client";

import { FileAudio, FileImage, FilePenLine, FileVideo, Mic, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

const mediaOptions = [
  { type: "voice", label: "Voice", accept: "audio/*", capture: true, icon: FileAudio },
  { type: "photo", label: "Photo", accept: "image/*", capture: "environment", icon: FileImage },
  { type: "handwritten", label: "Notes", accept: "image/*", capture: "environment", icon: FilePenLine },
  { type: "video", label: "Video", accept: "video/*", capture: "environment", icon: FileVideo },
];

export default function MediaUploader({ files, setFiles }) {
  const inputRef = useRef(null);
  const [selectedType, setSelectedType] = useState("voice");
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const current = mediaOptions.find((item) => item.type === selectedType) || mediaOptions[0];

  function openPicker(type) {
    setSelectedType(type);
    requestAnimationFrame(() => inputRef.current?.click());
  }

  function onPick(event) {
    const picked = Array.from(event.target.files || []);
    if (!picked.length) return;
    setFiles((items) => [
      ...items,
      ...picked.map((file) => ({
        id: crypto.randomUUID(),
        file,
        media_type: selectedType,
        status: "queued",
      })),
    ]);
    event.target.value = "";
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => chunksRef.current.push(event.data);
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
      setFiles((items) => [...items, { id: crypto.randomUUID(), file, media_type: "voice", status: "queued" }]);
    };
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-4 gap-2">
        {mediaOptions.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => openPicker(type)}
            className="grid min-h-20 place-items-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-black text-slate-700 shadow-sm active:scale-[0.98]"
          >
            <Icon className="mb-1 h-5 w-5 text-teal-700" />
            {label}
          </button>
        ))}
      </div>

      <Button variant={recording ? "danger" : "secondary"} onClick={toggleRecording} className="w-full">
        <Mic className="h-4 w-4" />
        {recording ? "Stop recording" : "Record voice memo"}
      </Button>

      <input
        ref={inputRef}
        type="file"
        hidden
        accept={current.accept}
        capture={current.capture}
        onChange={onPick}
      />

      {files.length ? (
        <div className="grid gap-2">
          {files.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900">{item.file.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone="teal">{item.media_type}</Badge>
                  <span className="text-xs font-semibold text-slate-500">{item.status}</span>
                </div>
              </div>
              <button
                type="button"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => setFiles((items) => items.filter((file) => file.id !== item.id))}
                aria-label="Remove file"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
