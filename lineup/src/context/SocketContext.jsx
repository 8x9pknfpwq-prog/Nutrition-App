import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';
import { DEMO, demoSocket } from '../lib/demo.js';
import { IS_SUPABASE } from '../lib/mode.js';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  // Connect once we have an authenticated user (cookie is sent automatically).
  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // Supabase mode: realtime is added in Stage 2b. For now, no live socket
    // (the app refetches after actions), so components see a null socket.
    if (IS_SUPABASE) {
      setSocket(null);
      return;
    }

    // Demo builds use the in-browser simulated socket.
    if (DEMO) {
      socketRef.current = demoSocket;
      setSocket(demoSocket);
      return () => {
        demoSocket.disconnect();
        socketRef.current = null;
        setSocket(null);
      };
    }

    const s = io('/', { withCredentials: true });
    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [user]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
