import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
  console.log(email, password);
  try {
    const res = await axios({
      method: 'POST',
      url: 'http://localhost:8000/api/v1/users/login',
      data: {
        email, password
      }
    })
    if (res.data.status === 'success')
      showAlert('success', 'logged in successfully');
    window.setTimeout(() => {
      location.assign('/')
    }, 0)
  }
  catch (err) {
    showAlert('error', err.response.data.message)
  }
}

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: 'http://localhost:8000/api/v1/users/logout'
    });
    if (res.data.status === 'success') {
      showAlert('success', 'logged out successfully');
      location.assign('/')
    }
  } catch (error) {
    showAlert('error', 'Error Logging out, try again!')
  }
}