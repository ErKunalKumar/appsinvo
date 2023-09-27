const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/User");
const moment = require("moment");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const jwt = require("jsonwebtoken");

// Function to generate a JWT token
function generateToken(userId) {
  const secretKey = process.env.SECRET_KEY;
  return jwt.sign({ userId }, secretKey, { expiresIn: "1d" });
}

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/userdb", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(express.json());

// Create a new user
app.post("/users", async (req, res) => {
  try {
    const { name, email, password, address, latitude, longitude, status } =
      req.body;
    const user = new User({
      name,
      email,
      password,
      address,
      latitude,
      longitude,
      status,
    });

    // Generate a token and save it to the user
    const token = generateToken(user._id);
    user.token = token;

    await user.save();

    // Construct the response in the specified format
    const response = {
      status_code: 200,
      message: "User created successfully",
      data: {
        name: user.name,
        email: user.email,
        address: user.address,
        latitude: user.latitude,
        longitude: user.longitude,
        status: user.status,
        register_at: user.register_at,
        token: user.token,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    res
      .status(400)
      .json({ status_code: 400, message: error.message, data: null });
  }
});

// Change user status
app.patch("/users/status", async (req, res) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.SECRET_KEY); // Replace with your secret key
    const userId = decoded.userId;

    const { newStatus } = req.body;

    // Update the user's status
    const result = await User.findOneAndUpdate(
      { _id: userId },
      { status: newStatus },
      { new: true }
    );

    if (!result) {
      return res
        .status(404)
        .json({ status_code: 404, message: "User not found" });
    }

    const response = {
      status_code: 200,
      message: "User status updated successfully",
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ status_code: 400, message: error.message });
  }
});

// Calculate distance
app.get("/distance", async (req, res) => {
  try {
    // console.log(req);
    const token = req.header("Authorization").replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.SECRET_KEY); // Replace with your secret key
    const user = await User.findOne({ _id: decoded.userId });
    // console.log(user);
    // console.log(req.query);

    const { destinationLatitude, destinationLongitude } = req.query;

    // User's current latitude and longitude
    const userLatitude = user.latitude;
    const userLongitude = user.longitude;

    // Calculate distance using Haversine formula
    const distance = calculateDistance(
      userLatitude,
      userLongitude,
      destinationLatitude,
      destinationLongitude
    );
    // console.log(distance);

    const response = {
      status_code: 200,
      message: "Distance calculated successfully",
      //   distance: `${distance.toFixed(2)} km`,
      distance: `${distance}km`,
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ status_code: 400, message: error.message });
  }
});

// Function to calculate distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// week CALCULATE here(if u want to run this code then uncomment below cide and then run the code)

// // Get users list grouped by weekday
// app.get("/users/list", async (req, res) => {
//   try {
//     const authorizationHeader = req.header("Authorization");
//     if (!authorizationHeader) {
//       return res
//         .status(400)
//         .json({ status_code: 400, message: "Authorization header missing" });
//     }

//     const token = authorizationHeader.replace("Bearer ", "");
//     // console.log("received token", token);
//     // console.log("Token to verify:", token);
//     console.log("Secret key:", process.env.SECRET_KEY);
//     const decoded = jwt.verify(token, process.env.SECRET_KEY); // Replace with your secret key

//     const { week_number } = req.query;
//     const user = await User.findOne({ _id: decoded.userId });

//     // Get the start and end of the week for the provided week number
//     const weekStart = getWeekStart(week_number);
//     const weekEnd = getWeekEnd(week_number);

//     // Group users by weekday
//     const userByWeekday = await User.aggregate([
//       {
//         $match: {
//           register_at: {
//             $gte: new Date(weekStart),
//             $lt: new Date(weekEnd),
//           },
//         },
//       },
//       {
//         $group: {
//           _id: {
//             $dayOfWeek: { date: "$register_at", timezone: "Asia/Calcutta" },
//           },
//           users: { $push: { name: "$name", email: "$email" } },
//         },
//       },
//       {
//         $project: {
//           dayOfWeek: "$_id",
//           users: 1,
//           _id: 0,
//         },
//       },
//     ]);

//     const response = {
//       status_code: 200,
//       message: "Users list grouped by weekday",
//       data: formatUserByWeekday(userByWeekday),
//     };

//     res.status(200).json(response);
//   } catch (error) {
//     res.status(400).json({ status_code: 400, message: error.message });
//   }
// });

// // Function to get the start of the week for a given week number
// function getWeekStart(weekNumber) {
//   // Adjust the timezone offset as needed
//   const now = moment().utcOffset("+05:30");
//   return now.clone().startOf("isoWeek").add(weekNumber, "weeks");
// }

// // Function to get the end of the week for a given week number
// function getWeekEnd(weekNumber) {
//   return getWeekStart(weekNumber).clone().endOf("isoWeek");
// }

// // Function to format the user list by weekday
// function formatUserByWeekday(userByWeekday) {
//   const weekdays = [
//     "Sunday",
//     "Monday",
//     "Tuesday",
//     "Wednesday",
//     "Thursday",
//     "Friday",
//     "Saturday",
//   ];
//   const formattedData = {};

//   for (const userDay of userByWeekday) {
//     formattedData[weekdays[userDay.dayOfWeek - 1]] = userDay.users;
//   }

//   return formattedData;
// }

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
