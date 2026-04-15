const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
    // Only allow POST requests for creating a checkout session
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    try {
        // Create Checkout Sessions from body params
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    // Provide the exact Price ID (for example, price_1234) of the product you want to sell
                    // TO DO: The user must replace this with the generated Price ID from their Stripe Dashboard.
                    price: 'price_1TMTemRMYE0lJteY0jQgIGgr',
                    quantity: 1,
                },
            ],
            mode: 'subscription', // Use 'payment' if this is a one-time setup
            success_url: `${req.headers.origin}/?success=true`,
            cancel_url: `${req.headers.origin}/?canceled=true`,
        });

        res.status(200).json({ url: session.url });
    } catch (err) {
        console.error("Stripe API Error:", err.message);
        res.status(err.statusCode || 500).json({ error: err.message });
    }
};
