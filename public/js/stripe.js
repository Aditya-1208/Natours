import axios from "axios";
import { showAlert } from "./alerts";
const pk = 'pk_test_51LqUe7SEjcN9V2xIDZMj2q9fP2ZBlXoPrBxgsPEu2M7KVj1OpCZMfQLrLMIg6x4jrF5VzKAfqpIx0mwGI0qnweDe00nEIWn6Lq';
const stripe = Stripe(pk)

export const bookTour = async tourId => {
    //get checkout-session from server/API
    try {
        const session = await axios(`http://localhost:8000/api/v1/bookings/checkout-session/${tourId}`);
        console.log(session);
        //Create checkout form + payment UI
        await stripe.redirectToCheckout({
            sessionId: session.data.session.id
        })
    } catch (error) {
        showAlert('error', error)
    }
};