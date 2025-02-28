import React from 'react'
import axios from '../libs/axios';

export default function LandingPage() {

  const handleLogin = e => {
    e.preventDefault()
    const username = e.target.username.value
    const password = e.target.password.value
    axios.post('/auth/login', { username, password }, {withCredentials: true})
      .then(res => {
        if (res.status === 200) {
          window.location.href = '/'
        }
      })
      .catch(err => {
        console.log(err)
      });
  }

  return (
    <div className="">
      <form className="max-w-sm mx-auto flex flex-col space-y-2 mt-10 dark:bg-gray-950 p-5 rounded-lg shadow-lg" onSubmit={handleLogin}>
      <h2 className='text-center text-2xl mb-4 font-medium'>Login</h2>
        <div className="mb-5">
          <label htmlFor="name" className="block mb-2 text-lg font-medium text-gray-900 dark:text-white">Your username</label>
          <input type="text" id="username" name='username' className="bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Username" required />
        </div>
        <div className="mb-5">
          <label htmlFor="password" className="block mb-2 text-lg font-medium text-gray-900 dark:text-white">Your password</label>
          <input type="password" name='password' placeholder='Password' id="password" className="bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" required />
        </div>
        <div className="flex items-start mb-5">
          <div className="flex items-center h-5">
            <input id="remember" type="checkbox" value="" className="w-4 h-4 border border-gray-300 rounded-sm bg-gray-50 focus:ring-3 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800" />
          </div>
          <label htmlFor="remember" className="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">Remember me</label>
        </div>
        <button type="submit" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Submit</button>
        <span>Don't have an account? Create <a href='/register'>here</a>.</span>
      </form>
    </div>
  )
}
