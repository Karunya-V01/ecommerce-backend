const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Order = require('../models/Order'); 
const auth = require('../middleware/authMiddleware');

const axios = require('axios');
const router = express.Router();

const INSTAMOJO_API_KEY = process.env.INSTAMOJO_API_KEY;
const INSTAMOJO_AUTH_TOKEN = process.env.INSTAMOJO_AUTH_TOKEN;


const CLIENT_ID = "kgy7BPIbmplxxV1DKqFNTomB0dG7TwcUtRucWMje";     
const SECRET_KEY = "omxZDT4UMwEMht47NMDjrPCQMwuTw7SswenzSXHugIx9gReAMqwUiQikHHFOqx3y10an8tOHQfEuEjj8zfYOZ5xvIsC20iszOmWzHDGOYer4fOMMEEWTc9p4nQPxprzu"; // from dashboard

async function getAccessToken() {
  try {
    const response = await axios.post(
      "https://api.instamojo.com/oauth2/token/",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: SECRET_KEY,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    console.log(response.data.access_token)
    return response.data.access_token;
  } catch (error) {
    console.error("Error getting access token:", error.response || error.message);
    throw new Error("Failed to generate access token");
  }
}
// getAccessToken();

// ✅ Register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ✅ Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(400).json({ message: "Invalid credentials" });

    // generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


router.post('/getInfo',auth, async(req, res)=>{
  try{
  const userId = req.userId;

    if (!userId) {
      return res.status(400).json({ message: "User ID not found ❌" });
    }
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found ❌" });
    }
    res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("Error in /getInfo:", err.message);
    res.status(500).json({ message: "Server error ❌" });
  }
})

router.post("/create-payment", async (req, res) => {
  const { name, email, amount } = req.body;

  try {
    const accessToken = 'GhSXxpf2y59k6F3H0L8HM7mpKu7RGiFPrPFAnzagtA0.-y0N5KWCAxCmkl6jqmNacf6UJwn1cbti6q861T1QWpI';

    const response = await axios.post(
      "https://api.instamojo.com/v2/payment_requests/",
      new URLSearchParams({
        purpose: "Order Payment",
        amount: amount,
        buyer_name: name,
        email: email,
        redirect_url: "http://localhost:1234/order-success",
        allow_repeated_payments: false,
        send_email: true,
      }),
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
      }
    );

    res.json({ payment_url: response.data.payment_request.longurl });

  } catch (error) {
    console.error("Error creating payment link:", error.response || error.message);
    res.status(500).json({ error: "Failed to create payment link" });
  }
});



router.post('/order-success', async (req, res) => {
  const { payment_id, payment_request_id } = req.body;

  try {
    const accessToken = 'GhSXxpf2y59k6F3H0L8HM7mpKu7RGiFPrPFAnzagtA0.-y0N5KWCAxCmkl6jqmNacf6UJwn1cbti6q861T1QWpI';
    const paymentDetails = await axios.get(
      `https://api.instamojo.com/v2/payments/${payment_id}/`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    const paymentData = paymentDetails.data;

    if (paymentData.status === 'Credit') {
      const newOrder = new Order({
        paymentId: paymentData.id,
        paymentRequestId: paymentData.payment_request,
        buyerName: paymentData.buyer_name,
        email: paymentData.buyer_email,
        amount: paymentData.amount,
        status: paymentData.status,
        paymentDate: paymentData.created_at,
      });

      await newOrder.save();

      res.status(200).json({ message: 'Order saved successfully' });
    } else {
      res.status(400).json({ message: 'Payment not successful' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error.response || error.message);
    res.status(500).json({ error: 'Failed to verify and save order' });
  }
});


module.exports = router;


// https://github.com/Karunya-V01/ecommerce-backend.git


// https://github.com/Karunya-V01/ecommerce.git