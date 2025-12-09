import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Always talk to Vercel API
const API_BASE_URL = "https://yr4project.vercel.app";

let onlineUsers = {};

io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // Online user tracking
    socket.on("user-online", (email) => {
        onlineUsers[email] = socket.id;
        io.emit("online-users", onlineUsers);
    });

    // Announcements
    socket.on("announcement", async (data) => {
        io.emit("announcement", data);

        try {
            await fetch(`${API_BASE_URL}/api/saveAnnouncement`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            console.log("Announcement saved to DB");
        } catch (err) {
            console.error("Error saving announcement:", err);
        }
    });

    // Join a space
    socket.on("join-space", (spaceId) => {
        socket.join(spaceId);
    });

    // Space messages
    socket.on("space-message", async (data) => {
        io.to(data.spaceId).emit("space-message", data);

        try {
            await fetch(`${API_BASE_URL}/api/saveSpaceMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...data, timestamp: Date.now() })
            });
            console.log("Space message saved");
        } catch (err) {
            console.error("Error saving space message:", err);
        }
    });

    // Direct message room join
    socket.on("join-room", (room) => {
        socket.join(room.trim().toLowerCase());
    });

    // Direct message send
    socket.on("send-message", (data) => {
        const room = data.roomId.trim().toLowerCase();
        io.to(room).emit("receive-message", data);
    });

    // Disconnect
    socket.on("disconnect", () => {
        for (const email in onlineUsers) {
            if (onlineUsers[email] === socket.id) {
                delete onlineUsers[email];
            }
        }
        io.emit("online-users", onlineUsers);
    });
});

app.get("/", (req, res) => {
    res.send("Socket Server Running");
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
