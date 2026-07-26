import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import axios from 'axios';
import {
  FiSearch, FiBell, FiPlus, FiMessageSquare, FiX,
  FiRefreshCw, FiWifiOff, FiMoreHorizontal, FiImage
} from 'react-icons/fi';
import BottomNav from '../components/BottomNav';

/* বাকি কোড একই থাকবে (Homepage component) */
