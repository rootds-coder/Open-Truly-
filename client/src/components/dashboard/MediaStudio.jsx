import { useState, useEffect } from "react";
import "./MediaStudio.css";

export default function MediaStudio() {
    const [assets, setAssets] = useState([]);
    const [title, setTitle] = useState("");
    const [mediaType, setMediaType] = useState("document");
    const [keywords, setKeywords] = useState("");
    const [file, setFile] = useState(null);
    const [fileUrl, setFileUrl] = useState("");
    const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });
    const [uploading, setUploading] = useState(false);

    const fetchAssets = async () => {
        try {
            const res = await fetch("/api/media", { credentials: "include" });
            const data = await res.json();
            if (data.ok) setAssets(data.assets || []);
        } catch (_) {}
    };

    useEffect(() => {
        fetchAssets();
    }, []);

    const handleUploadMedia = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            setStatusMsg({ text: "Title is required", type: "error" });
            return;
        }

        const formData = new FormData();
        formData.append("title", title.trim());
        formData.append("mediaType", mediaType);
        formData.append("keywords", keywords);
        if (file) formData.append("file", file);
        if (fileUrl) formData.append("fileUrl", fileUrl.trim());

        setUploading(true);
        setStatusMsg({ text: "Uploading media asset…", type: "info" });

        try {
            const res = await fetch("/api/media", {
                method: "POST",
                body: formData,
                credentials: "include",
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                setStatusMsg({ text: data.message, type: "success" });
                setTitle("");
                setKeywords("");
                setFile(null);
                setFileUrl("");
                fetchAssets();
            } else {
                setStatusMsg({ text: data.error || "Upload failed", type: "error" });
            }
        } catch (_) {
            setStatusMsg({ text: "Error uploading media asset.", type: "error" });
        }
        setUploading(false);
    };

    const handleDeleteAsset = async (id, assetTitle) => {
        if (!confirm(`Delete media asset "${assetTitle}"?`)) return;
        try {
            await fetch(`/api/media/${id}`, { method: "DELETE", credentials: "include" });
            fetchAssets();
        } catch (_) {}
    };

    return (
        <div className="dash-grid-equal">
            {/* Upload Media Asset */}
            <div className="dash-card">
                <div className="dash-card__head">
                    <div>
                        <div className="dash-card__title">🖼️ Upload Media Attachment</div>
                        <div className="dash-card__sub">Attach PDFs, product photos, or audio notes to AI responses</div>
                    </div>
                </div>

                <div className="dash-card__body">
                    <form onSubmit={handleUploadMedia} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div>
                            <label className="dash-label">Asset Title</label>
                            <input
                                type="text"
                                className="dash-input"
                                placeholder="e.g. Product Brochure PDF / Price Chart Image"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div style={{ display: "flex", gap: 12 }}>
                            <div style={{ flex: 1 }}>
                                <label className="dash-label">Media Type</label>
                                <select
                                    className="dash-input"
                                    value={mediaType}
                                    onChange={(e) => setMediaType(e.target.value)}
                                >
                                    <option value="document">📄 PDF Document</option>
                                    <option value="image">📸 Image (JPG/PNG)</option>
                                    <option value="audio">🎙️ Voice / Audio</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="dash-label">Trigger Keywords (Comma separated)</label>
                            <input
                                type="text"
                                className="dash-input"
                                placeholder="e.g. brochure, catalog, pricing, photos"
                                value={keywords}
                                onChange={(e) => setKeywords(e.target.value)}
                            />
                            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                                When a user messages any of these keywords, the AI automatically sends this attachment!
                            </div>
                        </div>

                        <div>
                            <label className="dash-label">Select File to Upload (.pdf, .jpg, .mp3)</label>
                            <input
                                type="file"
                                className="dash-input"
                                onChange={(e) => setFile(e.target.files[0])}
                            />
                        </div>

                        {statusMsg.text && (
                            <div className={`dash-alert dash-alert--${statusMsg.type}`}>
                                {statusMsg.text}
                            </div>
                        )}

                        <button type="submit" className="dash-btn dash-btn--primary" disabled={uploading}>
                            {uploading ? "Uploading Asset…" : "🚀 Save Media Asset"}
                        </button>
                    </form>
                </div>
            </div>

            {/* Media Assets Roster */}
            <div className="dash-card">
                <div className="dash-card__head">
                    <div>
                        <div className="dash-card__title">📁 Active Media Assets ({assets.length})</div>
                        <div className="dash-card__sub">Attachments triggered by user keywords</div>
                    </div>
                </div>

                <div className="dash-card__body">
                    <div className="dash-file-list">
                        {assets.length > 0 ? (
                            assets.map((a) => (
                                <div className="dash-file-chip" key={a._id} style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                                    <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
                                        <div style={{ fontWeight: 700, color: "#ffffff", fontSize: 13 }}>
                                            {a.mediaType === "document" ? "📄" : a.mediaType === "image" ? "📸" : "🎙️"} {a.title}
                                        </div>
                                        <button className="dash-contact__del" onClick={() => handleDeleteAsset(a._id, a.title)}>✕</button>
                                    </div>
                                    <div style={{ fontSize: 11, color: "#a78bfa" }}>
                                        Triggers: {Array.isArray(a.keywords) && a.keywords.length > 0 ? a.keywords.join(", ") : "None"}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: "center", color: "#64748b", padding: "40px 0", fontSize: 13 }}>
                                No media attachments created yet.<br />
                                Upload a brochure PDF or product image on the left.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
