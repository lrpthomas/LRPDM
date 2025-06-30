import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { apiService } from '../../services/apiService';

interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
}

interface AuthComponentProps {
  onAuthChange?: (isAuthenticated: boolean, user?: User) => void;
}

const AuthComponent: React.FC<AuthComponentProps> = ({ onAuthChange }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  // Registration form state
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: ''
  });

  // Check if user is already authenticated on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    if (apiService.isAuthenticated()) {
      try {
        const response = await apiService.getCurrentUser();
        if (response.success && response.data) {
          setUser(response.data);
          setIsAuthenticated(true);
          onAuthChange?.(true, response.data);
        } else {
          // Token might be invalid
          setIsAuthenticated(false);
          onAuthChange?.(false);
        }
      } catch (error) {
        setIsAuthenticated(false);
        onAuthChange?.(false);
      }
    }
  };

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.login(loginForm.email, loginForm.password);
      
      if (response.success && response.data) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        setLoginForm({ email: '', password: '' });
        onAuthChange?.(true, response.data.user);
        Alert.alert('Success', 'Successfully logged in!');
      } else {
        Alert.alert('Login Failed', response.error || 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'Login failed. Please try again.');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerForm.username || !registerForm.email || !registerForm.password || !registerForm.full_name) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.register(registerForm);
      
      if (response.success) {
        Alert.alert('Success', 'Registration successful! Please log in.');
        setRegisterForm({ username: '', email: '', password: '', full_name: '' });
        setShowLogin(true);
      } else {
        Alert.alert('Registration Failed', response.error || 'Registration failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Registration failed. Please try again.');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await apiService.logout();
    setIsAuthenticated(false);
    setUser(null);
    onAuthChange?.(false);
  };

  if (isAuthenticated && user) {
    const isDevUser = user.id === 'dev-user-123';
    
    return (
      <View style={styles.userInfo}>
        <View style={styles.userDetails}>
          <Text style={styles.welcomeText}>
            👋 Welcome, {user.full_name}! {isDevUser && '🚀'}
          </Text>
          <Text style={styles.userRole}>Role: {user.role}</Text>
          <Text style={styles.userEmail}>
            {user.email} {isDevUser && '(DEV MODE)'}
          </Text>
        </View>
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    );
  }

  const handleDevBypass = () => {
    // Development bypass - creates a mock user session
    const mockUser = {
      id: 'dev-user-123',
      username: 'developer',
      email: 'dev@localhost.com',
      full_name: 'Development User',
      role: 'admin'
    };
    
    setUser(mockUser);
    setIsAuthenticated(true);
    onAuthChange?.(true, mockUser);
  };

  return (
    <View style={styles.authContainer}>
      <View style={styles.authHeader}>
        <Text style={styles.authTitle}>🗺️ GIS Platform</Text>
        
        {/* DEV BYPASS BUTTON - REMOVE IN PRODUCTION */}
        {process.env.NODE_ENV === 'development' && (
          <Pressable style={styles.devBypassButton} onPress={handleDevBypass}>
            <Text style={styles.devBypassText}>🚀 DEV BYPASS</Text>
          </Pressable>
        )}
        
        <View style={styles.authTabs}>
          <Pressable
            style={[styles.authTab, showLogin && styles.activeTab]}
            onPress={() => setShowLogin(true)}
          >
            <Text style={[styles.tabText, showLogin && styles.activeTabText]}>
              Login
            </Text>
          </Pressable>
          <Pressable
            style={[styles.authTab, !showLogin && styles.activeTab]}
            onPress={() => setShowLogin(false)}
          >
            <Text style={[styles.tabText, !showLogin && styles.activeTabText]}>
              Register
            </Text>
          </Pressable>
        </View>
      </View>

      {showLogin ? (
        <View style={styles.authForm}>
          <Text style={styles.formTitle}>Sign in to your account</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.textInput}
              value={loginForm.email}
              onChangeText={(text) => setLoginForm(prev => ({ ...prev, email: text }))}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.textInput}
              value={loginForm.password}
              onChangeText={(text) => setLoginForm(prev => ({ ...prev, password: text }))}
              placeholder="Enter your password"
              secureTextEntry
              autoComplete="current-password"
            />
          </View>

          <Pressable
            style={[styles.authButton, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.authButtonText}>
              {loading ? '🔄 Signing in...' : '🔐 Sign In'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.authForm}>
          <Text style={styles.formTitle}>Create new account</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.textInput}
              value={registerForm.full_name}
              onChangeText={(text) => setRegisterForm(prev => ({ ...prev, full_name: text }))}
              placeholder="Enter your full name"
              autoComplete="name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.textInput}
              value={registerForm.username}
              onChangeText={(text) => setRegisterForm(prev => ({ ...prev, username: text }))}
              placeholder="Choose a username"
              autoCapitalize="none"
              autoComplete="username"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.textInput}
              value={registerForm.email}
              onChangeText={(text) => setRegisterForm(prev => ({ ...prev, email: text }))}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.textInput}
              value={registerForm.password}
              onChangeText={(text) => setRegisterForm(prev => ({ ...prev, password: text }))}
              placeholder="Create a password"
              secureTextEntry
              autoComplete="new-password"
            />
          </View>

          <Pressable
            style={[styles.authButton, loading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.authButtonText}>
              {loading ? '🔄 Creating account...' : '📝 Create Account'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  authContainer: {
    flex: 1,
    maxWidth: 400,
    margin: 'auto',
    padding: 20,
    justifyContent: 'center'
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196f3'
  },
  userDetails: {
    flex: 1
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 2
  },
  userRole: {
    fontSize: 12,
    color: '#1976d2',
    textTransform: 'capitalize'
  },
  userEmail: {
    fontSize: 11,
    color: '#666'
  },
  logoutButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  authHeader: {
    marginBottom: 32,
    alignItems: 'center'
  },
  authTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 24,
    textAlign: 'center'
  },
  authTabs: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 4
  },
  authTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center'
  },
  activeTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d'
  },
  activeTabText: {
    color: '#2c3e50',
    fontWeight: '600'
  },
  authForm: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center'
  },
  inputGroup: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 6
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#495057'
  },
  authButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8
  },
  disabledButton: {
    backgroundColor: '#6c757d'
  },
  authButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  devBypassButton: {
    backgroundColor: '#ff6b35',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#ff4757',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  devBypassText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5
  }
});

export default AuthComponent;