const params = new URLSearchParams(window.location.search);
const slot = params.get("slot");

if (!slot) {
  alert("Invalid note slot");
}

// Load note
fetch(`/api/notes/${slot}`)
  .then(res => res.json())
  .then(note => {
    document.getElementById("note-title").value = note.title || "";
    document.getElementById("note-content").value = note.content || "";
  });

// Save note
function saveNote() {
  const title = document.getElementById("note-title").value.trim();
  const content = document.getElementById("note-content").value.trim();

  fetch(`/api/notes/${slot}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content })
  })
  .then(() => {
    window.location.href = "/notes.html";
  });
}
