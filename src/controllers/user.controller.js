import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiRes } from "../utils/ApiRes.js";
import mongoose from "@types/mongoose";

const genAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.genAccessToken();
    const refreshToken = user.genRefreshToken();

    // saving refresh token to db
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

// register
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullName, password } = req.body;
  if (
    [username, email, fullName, password].some((field) => field?.trim() === "")
    // expression is checking if at least one of the values in
    // the array [username, email, fullName, password] is an empty string after trimming.
  ) {
    throw new ApiError(400, "All fields are req");
  }
  // validation
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) throw new ApiError(409, "User or Email already exists");

  // check imgs
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  // console.log(coverImageLocalPath);

  // if(req.files.coverImage[0].path)

  // upload on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar is required");
  }

  // save in db

  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
  });

  // checking user created successfully or not
  const createdUser = await User.findById(user._id).select(
    "-passowrd -refreshToken"
    // lets you to remove the password and refreshTOken while shwoing res
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registration");
  }

  // returing res
  return res.status(201).json(new ApiRes(200, createdUser, "User Registered"));
});

// login
const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // if (username || email === "") {
  //   throw new ApiError(400, "Username or Email is required");
  // }
  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }

  // check through db
  const user = await User.findOne({ $or: [{ username }, { email }] });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  // pass check, the password is coming from req.body
  const passwordValid = await user.passCheck(password);
  if (!passwordValid) {
    throw new ApiError(401, "Password is wrong");
  }
  const { accessToken, refreshToken } = await genAccessTokenAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  // makes the cookies not editable
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiRes(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

// logout
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiRes(200, {}, "User Logout!"));
});

// refresh token
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Access");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refresh token expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, newRefreshToken } =
      await genAccessTokenAndRefreshToken(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiRes(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPass, newPass } = req.body;
  const user = await User.findById(req.user?._id);
  const isPassCorrect = await user.passCheck(oldPass);
  if (!isPassCorrect) {
    throw new ApiError(400, "Invalid old Password");
  }
  user.password = newPass;
  await user.save({
    validateBeforeSave: false,
  });

  return res.status(200).json(new ApiRes(200, {}, "Password Changed!"));
});

const getCurrUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiRes(200, req.user, "Current User"));
});

const updateAccDetails = asyncHandler(async (req, res) => {
  const { email, fullName } = req.body;
  if (!fullName || !email) {
    throw new ApiError(400, "Fields are required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiRes(200, user, "Account Updated Successfully"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  return res.status(200).json(new ApiRes(200, user, "Avatar Image updated"));
});
const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "coverImage file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  return res.status(200).json(new ApiRes(200, user, "Cover Image updated"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(404, "User not found");
  }

  const channel = await User.aggregate([
    {
      // matching the username - double check
      // pipeline
      $match: {
        username: username?.toLowerCase(),
      },
    },

    // pipeline - for getting the no of user has subscribed to the channel owner - Subscriber
    {
      $lookup: {
        from: "subscriptions", // from the Subscription bcz in DB it becomes subscriptions
        localField: "_id",
        foreignField: "channel",
        as: "Subscribers",
      },
    },
    // pipeline - for getting the no of channel owner has subscribed
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "SubscribedTo",
      },
    },
    // pipeline - adding new field
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);
  console.log(channel);
  if (channel?.length) {
    throw new ApiError(404, "Channel Does not exist");
  }
  return res
    .status(200)
    .json(new ApiRes(200, channel[0], "User Channel Details fetched"));
});

const getwatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        // _id: req.user._id
        _id: new mongoose.Types.ObjectId(req.user._id), //user id match with object id
      },
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
  .status(200)
  .json(
    new ApiRes(200,user[0].watchHistory,"Watched History of User")
  )
});
export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrUser,
  updateAccDetails,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getwatchHistory,
};
