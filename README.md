# Belot
A web-based implementation of the bulgarian playing cards game "Belot". The main idea of the project was to play belot online for free with your friends. 

## Installation 
  1. Clone the repo
     ```
     git clone https://github.com/vichmi/belot.git
     cd belot
     ```
  2. Install the dependencies
     ```
     cd server
     npm i
     cd ../client-vite
     npm i
     ```
     or `yarn install`
  3. Run the application
     For development mode:
       ```
       npm run dev
       ```
     And then head to `http://localhost:5173/`
     
     For production build:
       ```
       npm run build
       ```
      Open the dist folder and start a http server there

## Usage
After you have created an account create a room and refresh either the page or from the table. Join the room. If you open a new tab and you are in the lobby page and try to join the room it wouldn't allow it. For testing instead copy the room url and open 4 tabs in total
and enjoy.
