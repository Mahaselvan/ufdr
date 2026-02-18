const express = require("express");
const multer = require("multer");
const path = require("path");
const { uploadUfdr } = require("../controllers/uploadController");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, path.join(process.cwd(), "uploads")),
  filename: (_, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
    cb(null, safeName);
  }
});

const upload = multer({ storage });

router.post("/upload-ufdr", upload.single("file"), uploadUfdr);

module.exports = router;
