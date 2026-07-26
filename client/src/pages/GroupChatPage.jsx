import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  FiArrowLeft, FiSend, FiImage, FiUsers, FiBarChart2,
  FiX, FiPlus, FiSmile
} from 'react-icons/fi';
import { io } from 'socket.io-client';
import BottomNav from '../components/BottomNav';

/* বাকি কোড একই থাকবে (GroupChatPage component) */
