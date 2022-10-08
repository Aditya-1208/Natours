import axios from "axios"
import { showAlert } from "./alerts";
export const updateSettings = async (data, type) => {
    try {
        const url = `/api/v1/users/${type === 'data' ? 'updateMe' : 'updatePassword'}`;
        const res = await axios.patch(url, data)
        if (res.data.status === "success") {
            showAlert('success', `updated ${type === 'data' ? 'details' : 'password'} successfully`);
            location.reload();
        }
    } catch (error) {
        showAlert('error', error.response.data.message);
    }
}