const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
    // Only allow POST requests for creating a checkout session
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    try {
        const { plan } = req.body || {};

        // Define price IDs for each plan
        const prices = {
            starter: 'price_1TMTf4RMYE0lJteYQwRKGDP9',
            creator: 'price_1TMTfNRMYE0lJteYqKzyO60p',
            // Example of your already-entered Enterprise ID:
            enterprise: 'price_1TMTemRMYE0lJteY0jQgIGgr'
        };

        // Fallback to enterprise if no plan is specified
        const priceId = prices[plan] || prices.enterprise;

        // Create Checkout Sessions from body params
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price: priceId,
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
