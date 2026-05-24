import './App.css';
import './styles/theme.css';
import './styles/grailmeter.css';
import './styles/pages.css';
import './styles/responsive.css';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useAuthContext } from './AuthContext';
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
import EditItem from './components/UserInfo/EditItem';
import RatingScreen from './components/Rating/RatingScreen';
import AdminDashboard from './components/Admin/AdminDashboard';
import MatchScreen from './components/Match/MatchScreen';
import PriceSuggestion from './components/Releases/PriceSuggestion';
import MeterScreen from './components/Meter/MeterScreen';
import NowPlayingScreen from './components/NowPlaying/NowPlayingScreen';
import Shell from './components/Shell/Shell';

function ProfileRedirect() {
  const { authState } = useAuthContext();
  if (authState?.username) {
    return <Navigate to={`/profile/${authState.username}`} replace />;
  }
  return <Navigate to="/login" replace />;
}

function HomeRedirect() {
  const { isAuthenticated } = useAuthContext();
  return isAuthenticated ? <Navigate to="/now" replace /> : <UsersDirectory />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route element={<Shell />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/users" element={<UsersDirectory />} />
          <Route path="/home" element={<UsersDirectory />} />
          <Route path="/now" element={
            <PrivateRoute>
              <NowPlayingScreen />
            </PrivateRoute>
          } />
          <Route path="/search" element={<SearchScreen />} />
          <Route path="/collection" element={
            <PrivateRoute>
              <CollectionScreen />
            </PrivateRoute>
          } />
          <Route path="/wantlist" element={
            <PrivateRoute>
              <WantlistScreen />
            </PrivateRoute>
          } />
          <Route path="/match" element={
            <PrivateRoute>
              <MatchScreen />
            </PrivateRoute>
          } />
          <Route path="/meter" element={
            <PrivateRoute>
              <MeterScreen />
            </PrivateRoute>
          } />
          <Route path="/rating" element={
            <PrivateRoute>
              <RatingScreen />
            </PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute>
              <ProfileRedirect />
            </PrivateRoute>
          } />
          <Route path="/profile/:username" element={<UserProfile />} />
          <Route path="/edit/:discogsId" element={
            <PrivateRoute>
              <EditItem />
            </PrivateRoute>
          } />
          <Route path="/release/:id" element={<OneRelease />} />
          <Route path="/artist/:id" element={<ArtistDetail />} />
          <Route path="/label/:id" element={<LabelDetail />} />
          <Route path="/price-suggestion/:releaseId" element={
            <PrivateRoute>
              <PriceSuggestion />
            </PrivateRoute>
          } />
          <Route path="/admin" element={
            <PrivateRoute>
              <AdminDashboard />
            </PrivateRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
