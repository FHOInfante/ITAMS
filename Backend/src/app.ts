import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import { swaggerDocs } from "./config/swagger.js";

import authRoutes from "./routes/auth.routes.js";
import permissionRoutes from "./routes/permission.routes.js";
import userRoutes from "./routes/user.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import computerRoutes from "./routes/computer.routes.js";
import softwareRoutes from "./routes/software.routes.js";
import printerRoutes from "./routes/printer.routes.js";
import upsRoutes from "./routes/ups.routes.js";
import networkRoutes from "./routes/netdevice.routes.js";
import prRoutes from "./routes/purchasereq.routes.js";
import endUserRoutes from "./routes/enduser.routes.js";
import departmentRoutes from "./routes/department.route.js";
import vendorRoutes from "./routes/vendor.routes.js";
import peripheralRoutes from "./routes/peripheral.routes.js";
import programRoutes from "./routes/program.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import reportRoutes from "./routes/report.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://unpkg.com", "'unsafe-inline'"],
        scriptSrcElem: ["'self'", "https://unpkg.com", "'unsafe-inline'"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        styleSrcElem: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", "https://unpkg.com"],
        upgradeInsecureRequests: null,
      },
    },
    crossOriginOpenerPolicy: false,
    strictTransportSecurity: false,
  }),
);

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use(express.static(publicDir));

app.use("/api/auth", authRoutes);
app.use("/api/permission", permissionRoutes);
app.use("/api/user", userRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/computer", computerRoutes);
app.use("/api/software", softwareRoutes);
app.use("/api/printer", printerRoutes);
app.use("/api/ups", upsRoutes);
app.use("/api/network-device", networkRoutes);
app.use("/api/purchase-request", prRoutes);
app.use("/api/end-user", endUserRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/peripheral", peripheralRoutes);
app.use("/api/program", programRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/report", reportRoutes);

swaggerDocs(app);

app.get("/api/test", (_req, res) => {
  res.status(200).send("Server is up and running.");
});

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "Route accessed not found" });
  }
  res.status(404).send("Page not found");
});

export default app;
