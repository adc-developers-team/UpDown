import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import axios from 'axios';
import {
  FiArrowLeft, FiSend, FiSmile, FiMic, FiStopCircle,
  FiPlusCircle, FiImage, FiVideo, FiPhone, FiPhoneOff,
  FiMicOff, FiVideoOff, FiVolume2, FiCornerUpLeft, FiEdit,
  FiTrash, FiSlash, FiCheckCircle, FiUserX
} from 'react-icons/fi';
import { io } from 'socket.io-client';
import BottomNav from '../components/BottomNav';

/* বাকি কোড একই থাকবে (ChatRoomPage component) */
