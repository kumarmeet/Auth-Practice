const express = require("express");
const db = require("../data/database");

const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");

const router = express.Router();

router.get("/", (req, res) => {
  res.redirect("/welcome");
});

router.get("/welcome", (req, res) => {
  res.render("welcome");
});

router.get("/signup", (req, res) => {
  let sessionData = req.session.inputDataField;

  if (!sessionData) {
    sessionData = {
      hasError: false,
      email: "",
      confirmEmail: "",
      password: "",
    };
  }

  req.session.inputDataField = null;

  res.render("signup", { sessionData: sessionData });
});

router.post(
  "/signup",
  body("email").isEmail(),
  body("confirm-email").isEmail(),
  body("password").isLength({ min: 5 }),
  async (req, res) => {
    const errors = validationResult(req);

    const userData = req.body;

    const existingUser = {
      email: userData.email,
      confirmEmail: userData["confirm-email"],
      password: userData.password,
    };

    if (!errors.isEmpty() || existingUser.email !== existingUser.confirmEmail) {
      console.log("Error Occured!");

      req.session.inputDataField = {
        hasError: true,
        message: "Invalid data input, Please try again!",
        email: existingUser.email,
        confirmEmail: existingUser.confirmEmail,
        password: existingUser.password,
      };

      req.session.save(() => {
        res.redirect("/signup");
      });

      return;
    }

    const hasUser = await db
      .getDb()
      .collection("users")
      .findOne({ email: existingUser.email });

    if (hasUser) {
      req.session.inputDataField = {
        hasError: true,
        message: "User already exist, Please try again!",
        email: existingUser.email,
        password: existingUser.password,
      };

      req.session.save(() => {
        res.redirect("/signup");
      });

      return;
    }

    const hashedPassword = await bcrypt.hash(existingUser.password, 12);

    const user = {
      email: existingUser.email,
      password: hashedPassword,
    };

    await db.getDb().collection("users").insertOne(user);

    res.redirect("/login");
  }
);

router.get("/login", (req, res) => {
  let sessionData = req.session.inputDataField;

  if (!sessionData) {
    sessionData = {
      hasError: false,
      email: "",
      confirmEmail: "",
      password: "",
    };
  }

  req.session.inputDataField = null;

  res.render("login", { sessionData: sessionData });
});

router.post("/login", async (req, res) => {
  const user = req.body;

  const userData = {
    email: user.email,
    password: user.password,
  };

  const existingUser = await db
    .getDb()
    .collection("users")
    .findOne({ email: userData.email });

  if (!existingUser) {
    req.session.inputDataField = {
      hasError: true,
      message: "Could not log you in - plese check your credentials!",
      email: userData.email,
      password: userData.password,
    };

    req.session.save(() => {
      res.redirect("/login");
    });

    return;
  }

  const auth = await bcrypt.compare(userData.password, existingUser.password);

  if (!auth) {
    req.session.inputDataField = {
      hasError: true,
      message: "Could not log you in - plese check your credentials!",
      email: userData.email,
      password: userData.password,
    };

    req.session.save(() => {
      res.redirect("/login");
    });

    return;
  }

  req.session.user = {
    id: existingUser._id,
    email: existingUser.email,
    isAdmin: existingUser.isAdmin,
  };

  req.session.isAuthenticated = true;

  req.session.save(() => {
    res.redirect("/profile");
  });
});

router.get("/admin", (req, res) => {
  if (!res.locals.isAuth) {
    return res.status(401).render("401");
  }

  if (!res.locals.isAdmin) {
    return res.status(403).render("403");
  }

  res.render("admin");
});

router.get("/profile", (req, res) => {
  if (!res.locals.isAuth) {
    return res.status(401).render("401");
  }

  res.render("profile");
});

router.get("/logout", (req, res) => {
  req.session.user = null;
  req.session.isAuthenticated = false;

  res.redirect("/");
});

module.exports = router;
