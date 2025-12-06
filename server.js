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

io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("user-online", (email) => {
        onlineUsers[email] = socket.id;
        io.emit("online-users", onlineUsers);
    });


    socket.on("join-space", (spaceId) => {
        socket.join(spaceId);
    });

    socket.on("space-message", (data) => {
        io.to(data.spaceId).emit("space-message", data);
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