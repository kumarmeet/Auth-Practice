const path = require("path");

const express = require("express");
const session = require("express-session");
const mongodbStore = require("connect-mongodb-session");

const db = require("./data/database");
const authRoutes = require("./routes/authRoutes");

const MongoDBStore = mongodbStore(session);

const app = express();

const sessionStore = new MongoDBStore({
  uri: "mongodb://127.0.0.1:27017",
  databaseName: "auth-practice",
  collection: "sessions",
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));

app.use(
  session({
    secret: "528633",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 60 * 1000 * 60 * 24,
    },
  })
);

app.use(async (req, res, next) => {
  const user = req.session.user;
  const isAuth = req.session.isAuthenticated;

  if (!user || !isAuth) {
    return next();
  }

  const userDoc = await db
    .getDb()
    .collection("users")
    .findOne({ _id: user.id });

  const isAdmin = userDoc.isAdmin;

  res.locals.isAuth = isAuth;
  res.locals.isAdmin = isAdmin;

  next();
});

app.use(authRoutes);

app.use((error, req, res, next) => {
  res.status(500).render("500");
});

db.connectToDatabase().then(() => {
  app.listen(3000);
});
