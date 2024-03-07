import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiRes } from "../utils/ApiRes.js";
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
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0];
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  // if(req.files.coverImage[0].path)
  // {

  // }

  // upload on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
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

export { registerUser };
