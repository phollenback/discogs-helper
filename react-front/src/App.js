import './App.css';
import './styles/theme.css';
import './styles/responsive.css';
import {
  BrowserRouter,
  Routes,
  Route,
} from 'react-router-dom';
import LoginForm from './components/Login/LoginForm';
import RegisterScreen from './components/Login/RegisterScreen';
import PrivateRoute from './PrivateRoute';
import SearchScreen from './components/Search/SearchScreen';
import OneRelease from './components/Releases/OneRelease';
import ArtistDetail from './components/Artists/ArtistDetail';
import LabelDetail from './components/Labels/LabelDetail';
import CollectionScreen from './components/UserInfo/CollectionScreen';
import WantlistScreen from './components/UserInfo/WantlistScreen';
import UserProfile from './components/UserInfo/UserProfile';
import UsersDirectory from './components/UserInfo/UsersDirectory';
import Navbar from './components/All/Navbar';
import Footer from './components/All/Footer';
import EditItem from './components/UserInfo/EditItem';
import RatingScreen from './components/Rating/RatingScreen';
import AdminDashboard from './components/Admin/AdminDashboard';
import MatchScreen from './components/Match/MatchScreen';
import PriceSuggestion from './components/Releases/PriceSuggestion';
import MeterScreen from './components/Meter/MeterScreen';

function App() {
  return (
    <div className="grail-shell d-flex flex-column min-vh-100">
      <BrowserRouter>
        <Navbar />

        <main className="flex-grow-1 grail-content">
          <Routes>
          <Route path='/' element={<UsersDirectory/>}/>
          <Route path='/users' element={<UsersDirectory/>}/>
          <Route path='/login' element={<LoginForm/>}/>
          <Route path='/register' element={<RegisterScreen/>}/>

          <Route path='/home' element={<UsersDirectory/>}/>
          <Route path='/collection' element={
            <PrivateRoute>
              <CollectionScreen/>
            </PrivateRoute>
          }/>
          <Route path='/wantlist' element={
            <PrivateRoute>
              <WantlistScreen/>
            </PrivateRoute>
          }/>
          <Route path='/match' element={
            <PrivateRoute>
              <MatchScreen/>
            </PrivateRoute>
          }/>
          <Route path='/meter' element={
            <PrivateRoute>
              <MeterScreen/>
            </PrivateRoute>
          }/>
          <Route path='/rating' element={
            <PrivateRoute>
              <RatingScreen/>
            </PrivateRoute>
          }/>
          <Route path='/profile' element={
            <PrivateRoute>
              <UserProfile/>
            </PrivateRoute>
          }/>
          <Route path='/profile/:username' element={
              <UserProfile/>
          }/>
          <Route path='/edit/:discogsId' element={
            <PrivateRoute>
              <EditItem/>
            </PrivateRoute>
          }/>
          <Route path='/search'element={
            <SearchScreen/>
          }
          />
          <Route path='/release/:id'element={
            <OneRelease/>
          }
          />
          <Route path='/artist/:id' element={
            <ArtistDetail/>
          }
          />
          <Route path='/label/:id' element={
            <LabelDetail/>
          }
          />
          <Route path='/price-suggestion/:releaseId' element={
            <PrivateRoute>
              <PriceSuggestion/>
            </PrivateRoute>
          }/>
          <Route path='/admin' element={
            <PrivateRoute>
              <AdminDashboard/>
            </PrivateRoute>
          }/>
          </Routes>
        </main>

        <Footer />
      </BrowserRouter>
    </div>
  );
}

export default App;
