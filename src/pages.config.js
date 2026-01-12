import Dashboard from './pages/Dashboard';
import DealBuilder from './pages/DealBuilder';
import Search from './pages/Search';
import Settings from './pages/Settings';
import SyncChain from './pages/SyncChain';
import SyncContact from './pages/SyncContact';
import SyncRadar from './pages/SyncRadar';
import TagBank from './pages/TagBank';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "DealBuilder": DealBuilder,
    "Search": Search,
    "Settings": Settings,
    "SyncChain": SyncChain,
    "SyncContact": SyncContact,
    "SyncRadar": SyncRadar,
    "TagBank": TagBank,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};