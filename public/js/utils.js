export function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function getRoomCodeFromUrl(defaultRoom = "demo-room") {
    const params = new URLSearchParams(window.location.search);
    return (params.get("room") || defaultRoom).trim();
}