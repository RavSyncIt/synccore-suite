import Dashboard from './pages/Dashboard';
import TagBank from './pages/TagBank';
import Settings from './pages/Settings';
import Search from './pages/Search';
import DealBuilder from './pages/DealBuilder';
import SyncRadar from './pages/SyncRadar';
import SyncChain from './pages/SyncChain';
import SyncContact from './pages/SyncContact';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "TagBank": TagBank,
    "Settings": Settings,
    "Search": Search,
    "DealBuilder": DealBuilder,
    "SyncRadar": SyncRadar,
    "SyncChain": SyncChain,
    "SyncContact": SyncContact,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};