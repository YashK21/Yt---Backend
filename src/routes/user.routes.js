import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrUser,
  updateAccDetails,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getwatchHistory,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import verifyJwt from "../controllers/auth.middleware.js";

const router = Router();
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);
// upload is middleware for here
router.route("/login").post(loginUser);

// secured route
router.route("/logout").post(verifyJwt, logoutUser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/change-password").post(verifyJwt, changeCurrentPassword);

router.route("/current-user").get(verifyJwt, getCurrUser);

router.route("/update-details").patch(verifyJwt, updateAccDetails); //patch , not post otherwise other details can get updated

router
  .route("/update-avatar")
  .patch(verifyJwt, upload.single("avatar"), updateAvatar);

router
  .route("/update-cover")
  .patch(verifyJwt, upload.single("coverImage"), updateCoverImage);

router.route("/channel/:username").get(verifyJwt, getUserChannelProfile);

router.route("/history").get(verifyJwt, getwatchHistory);

router.route("/");
export default router;
