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

let onlineUsers = {};

// Force API to always hit Vercel
const API_BASE_URL = "http://localhost:3000";

io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("user-online", (email) => {
        onlineUsers[email] = socket.id;
        io.emit("online-users", onlineUsers);
    });

    socket.on("announcement", async (data) => {
        io.emit("announcement", data);

        try {
            await fetch(`${API_BASE_URL}/api/saveAnnouncement`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            console.log("Announcement saved");
        } catch (err) {
            console.error("Error saving announcement:", err);
        }
    });

    socket.on("join-space", (spaceId) => {
        socket.join(spaceId);
    });

    socket.on("space-message", async (data) => {
        io.to(data.spaceId).emit("space-message", data);

        try {
            await fetch(`${API_BASE_URL}/api/saveSpaceMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    timestamp: Date.now(),
                })
            });

            console.log("Message saved successfully");
        } catch (err) {
            console.error("Error saving message:", err);
        }
    });

    socket.on("join-room", (room) => {
        const cleanRoom = room.trim().toLowerCase();
        console.log("User joined DM room:", cleanRoom);
        socket.join(cleanRoom);
    });

    socket.on("send-message", (data) => {
        console.log("DM received on server:", data);
        const cleanRoom = data.roomId.trim().toLowerCase();
        io.to(cleanRoom).emit("receive-message", data);
    });

    socket.on("disconnect", () => {
        for (const email in onlineUsers) {
            if (onlineUsers[email] === socket.id) {
                delete onlineUsers[email];
                break;
            }
        }
        io.emit("online-users", onlineUsers);
    });
});

app.get("/", (req, res) => {
    res.send("Socket Server Running");
});

// Required for Render hosting
const PORT = process.env.PORT || 4000;
server.listen(PORT, "0.0.0.0", () =>
    console.log(`Server running on port ${PORT}`)
);
