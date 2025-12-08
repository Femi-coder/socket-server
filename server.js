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

const API_BASE_URL = process.env.NODE_ENV === "production"
    ? "https://yr4project.vercel.app/"
    : "http://localhost:3000";


io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("user-online", (email) => {
        onlineUsers[email] = socket.id;
        io.emit("online-users", onlineUsers);
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

    socket.on("join-room", (roomId) => {
        console.log("User joined DM room:", roomId);
        socket.join(roomId);
    });

        socket.on("send-message", (data) => {
        console.log("DM received on server:", data);
        io.to(data.roomId).emit("receive-message", data);
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

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));





