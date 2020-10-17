const express = require('express');

const path = require('path');

const app = express();

const mongo = require('mongodb');

const bodyParser = require('body-parser');

const cookieParser = require('cookie-parser');

const fs = require("fs");

let dbo;

mongo.MongoClient.connect("mongodb://localhost:27017/masqed", { useUnifiedTopology: true }, (error, db) => {
    if(error) {
        throw error;
    }
    dbo = db.db("masqed");

    console.log("MongoDB Connected");
})

app.set('views', path.join(__dirname, 'views'));

app.set('view engine', 'ejs');

app.use(express.static('./public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

function getCartItemCount(cart) {
    if(cart) {
        let items = cart.split(",");
        return items.length;
    }

    return 0;
}

function getCartItems(cart) {
    if(cart) {
        return cart.split(",");
    }
    return [];
}

app.get("/", (req, res) => {
    res.render('pages/home', {cartItemCount: getCartItemCount(req.cookies.cart)});
});

app.get("/about-us", (req, res) => {
    res.render('pages/about_us', {cartItemCount: getCartItemCount(req.cookies.cart)});
});

app.get("/buy-share", (req, res) => {
    res.render('pages/buy_share', {cartItemCount: getCartItemCount(req.cookies.cart)});
});

app.get("/instructions", (req, res) => {
    res.render('pages/instructions', {cartItemCount: getCartItemCount(req.cookies.cart)});
});

app.get("/products", (req, res) => {
    dbo.collection("products").find({}).toArray((err, results) => {
        res.render('pages/products', {products: results, cartItemCount: getCartItemCount(req.cookies.cart)});
    });
});

app.get("/contact-us", (req, res) => {
    res.render('pages/contact_us', {cartItemCount: getCartItemCount(req.cookies.cart)});
});

app.get("/privacy-policy", (req, res) => {
    res.render('pages/privacy_policy', {cartItemCount: getCartItemCount(req.cookies.cart)});
});

app.get("/add-to-cart/:id", (req, res) => {
    if(!req.cookies.cart) {
        res.cookie('cart', req.params.id).redirect("/cart");
    }
    else {
        let items = getCartItems(req.cookies.cart);

        items.forEach(item => {
            if(item === req.params.id) {
                res.redirect("/cart");
                throw new Error("item already in cart");
            }
        })

        items.push(req.params.id);
        res.cookie('cart', items.toString()).redirect("/cart");
    }
});

app.get("/cart", (req, res) => {
    let shoppingCart = [];
    let cart = req.cookies.cart;
    let items = getCartItems(cart);

    if(items.length == 0) {
        res.render("pages/cart", {cart: shoppingCart, cartItemCount: getCartItemCount(req.cookies.cart)});
    }
    else {
        items.forEach((item, index) => {
            dbo.collection("products").find({_id: new mongo.ObjectId(item)}).toArray((err, result) => {
                if(err)
                    throw err;

                shoppingCart.push(result[0]);

                if(items.length == index + 1) {
                    res.render("pages/cart", {cart: shoppingCart, cartItemCount: getCartItemCount(req.cookies.cart)});
                }
            })
        })
    }
});

app.get("/remove-from-cart/:id", (req, res) => {
    let items = getCartItems(req.cookies.cart);

    items.forEach((item, index) => {
        if(item === req.params.id) {
            items.splice(index, 1);
        }
    });

    res.cookie("cart", items.toString()).redirect("/cart");
})

app.get("/clear-cart", (req, res) => {
    res.clearCookie("cart").redirect("/products");
})

/*
app.get("/load-products", (req, res) => {
    dbo.collection("products").find({}).toArray((err, results) => {
        if(err)
            throw err;

        results.forEach((row, index) => {
            results[index]._id = null;
        })
        res.json(results);
    });
});
*/


app.get("/init", (req, res) => {
    let dbData = fs.readFileSync('products.json');

    let products = JSON.parse(dbData);

    dbo.collection("products").drop((err, success) => {
        if(err)
            throw err;
        console.log(products)

    });

   setTimeout(() => {
       dbo.collection("products").insertMany(products, (err) => {
           if(err) {
               throw err;
           }

           res.redirect("/");
       });
   }, 1000)
})


app.listen(8000, () => {
    console.log("App running on http://localhost:8000");
})