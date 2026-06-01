module.exports = function(app) {
  const express = require("express");
  const router = express.Router();
  const multer = require("multer");
  const { authMW } = require("../middleware/auth");
  const { supabase } = require("../config/db");
  
  const axios = require("axios");
  
  // Set up multer memory storage
  const storage = multer.memoryStorage();
  const upload = multer({ storage: storage });

  // GET /api/knowledge
  router.get("/", authMW, async (req, res) => {
    try {
      if (!req.auth.shopId) return res.status(400).json({ error: "No workspace selected" });
      
      const { data, error } = await supabase
        .from("shop_knowledge")
        .select("*")
        .eq("shop_id", req.auth.shopId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      res.json({ success: true, knowledge: data || [] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/knowledge/qa
  router.post("/qa", authMW, async (req, res) => {
    try {
      const { title, raw_content } = req.body;
      if (!title || !raw_content) {
        return res.status(400).json({ error: "Title and content are required" });
      }

      const { data, error } = await supabase
        .from("shop_knowledge")
        .insert([{
          shop_id: req.auth.shopId,
          type: "qa",
          title: title,
          raw_content: raw_content
        }])
        .select();

      if (error) throw error;
      
      const newRecord = data[0];
      
      // Fire and forget vectorization to Python Brain
      axios.post("http://localhost:8000/api/embed", {
        knowledge_id: newRecord.id,
        shop_id: req.auth.shopId
      }).catch(err => console.error("Vectorization trigger failed for QA:", err.message));

      res.json({ success: true, data: newRecord });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/knowledge/upload
  router.post("/upload", authMW, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const { title } = req.body;
      if (!title) return res.status(400).json({ error: "Title is required" });

      const fileName = `${req.auth.shopId}/${Date.now()}_${req.file.originalname}`;

      // Upload to Supabase Storage
      const { data: storageData, error: uploadError } = await supabase.storage
        .from("knowledge_files")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("knowledge_files")
        .getPublicUrl(fileName);

      const fileUrl = publicUrlData.publicUrl;

      // Insert into shop_knowledge
      const { data: dbData, error: dbError } = await supabase
        .from("shop_knowledge")
        .insert([{
          shop_id: req.auth.shopId,
          type: "document",
          title: title,
          file_url: fileUrl
        }])
        .select();

      if (dbError) {
        // Rollback storage upload if DB insert fails
        await supabase.storage.from("knowledge_files").remove([fileName]);
        throw dbError;
      }
      
      const newRecord = dbData[0];
      
      // Fire and forget vectorization to Python Brain
      axios.post("http://localhost:8000/api/embed", {
        knowledge_id: newRecord.id,
        shop_id: req.auth.shopId
      }).catch(err => console.error("Vectorization trigger failed for Document:", err.message));

      res.json({ success: true, data: newRecord });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE /api/knowledge/:id
  router.delete("/:id", authMW, async (req, res) => {
    try {
      // Find record first to get file_url
      const { data: record, error: findError } = await supabase
        .from("shop_knowledge")
        .select("*")
        .eq("id", req.params.id)
        .eq("shop_id", req.auth.shopId)
        .single();

      if (findError) throw findError;
      if (!record) return res.status(404).json({ error: "Record not found" });

      // Delete from DB
      const { error: deleteError } = await supabase
        .from("shop_knowledge")
        .delete()
        .eq("id", req.params.id)
        .eq("shop_id", req.auth.shopId);

      if (deleteError) throw deleteError;

      // Delete from storage if document
      if (record.file_url) {
        try {
          const urlObj = new URL(record.file_url);
          const pathSegments = urlObj.pathname.split('/knowledge_files/');
          if (pathSegments.length > 1) {
            const storagePath = decodeURIComponent(pathSegments[1]);
            await supabase.storage.from("knowledge_files").remove([storagePath]);
          }
        } catch(e) {
          console.error("Failed to delete storage file:", e);
        }
      }

      res.json({ success: true, message: "Deleted successfully" });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.use("/api/knowledge", router);
};
