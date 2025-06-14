const express = require("express");
const axios = require("axios");
require("dotenv").config();

const router = express.Router();

router.post("/send", async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({
      success: false,
      message: "Missing phone or message",
    });
  }

  try {
    const params = {
      api_key: process.env.BULKSMS_API,
      senderid: process.env.BULKSMS_SENDER,
      number: to,
      message: message,
    };

    const smsResponse = await axios.get("http://bulksmsbd.net/api/smsapi", {
      params,
    });

    // console.log("SMS API response:", smsResponse.data);


    if (smsResponse.data.response_code === "SUCCESS") {
      return res.json({ success: true, message: "SMS sent successfully" });
    } else {
      return res.status(400).json({
        success: false,
        message: smsResponse.data,
      });
    }
  } catch (err) {
    console.error("SMS Error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "SMS sending failed",
      error: err.response?.data || err.message,
    });
  }
});

module.exports = router;
