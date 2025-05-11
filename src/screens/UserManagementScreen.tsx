import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Appbar, Text, Card, Avatar, Badge, Button, Chip, Divider, FAB, Portal, Modal, TextInput, ActivityIndicator, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { RoleBasedRoute } from '../components/RoleBasedRoute';
import { getCurrentUser } from '../services/authService';

export const UserManagementScreen = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const theme = useTheme();
  const navigation = useNavigation();

  useEffect(() => {
    loadCurrentUser();
    fetchUsers();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Kullanıcı bilgileri yüklenirken hata:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');

      if (error) {
        console.error('Kullanıcılar yüklenirken hata:', error);
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Kullanıcı verileri çekilirken hata:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setEditMode(false);
    setShowUserModal(true);
  };

  const handleStatusToggle = async (user: User) => {
    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', user.id);

      if (error) {
        console.error('Kullanıcı durumu güncellenirken hata:', error);
        return;
      }

      // Kullanıcı listesini güncelle
      setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    } catch (error) {
      console.error('Kullanıcı durumu güncellenirken hata:', error);
    }
  };

  const handleUserUpdate = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: selectedUser.name,
          role: selectedUser.role,
          region_id: selectedUser.region_id,
          status: selectedUser.status
        })
        .eq('id', selectedUser.id);

      if (error) {
        console.error('Kullanıcı güncellenirken hata:', error);
        return;
      }

      // Kullanıcı listesini güncelle
      setUsers(users.map(u => u.id === selectedUser.id ? selectedUser : u));
      setShowUserModal(false);
    } catch (error) {
      console.error('Kullanıcı güncellenirken hata:', error);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return '#7C3AED'; // Mor
      case 'manager':
        return '#2563EB'; // Mavi
      case 'regional_manager':
        return '#059669'; // Yeşil
      case 'field_user':
        return '#F59E0B'; // Turuncu
      default:
        return '#6B7280'; // Gri
    }
  };

  const getRoleText = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Yönetici';
      case 'manager':
        return 'Genel Müdür';
      case 'regional_manager':
        return 'Bölge Müdürü';
      case 'field_user':
        return 'Saha Kullanıcısı';
      default:
        return 'Bilinmeyen Rol';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? '#10B981' : '#EF4444';
  };

  const getStatusText = (status: string) => {
    return status === 'active' ? 'Aktif' : 'Pasif';
  };

  const renderUserCard = ({ item }: { item: User }) => (
    <Card style={styles.card} elevation={1}>
      <Card.Content>
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Avatar.Text 
              size={50} 
              label={item.name.substring(0, 2).toUpperCase()} 
              style={{ backgroundColor: getRoleBadgeColor(item.role) }}
            />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
              <View style={styles.badgeContainer}>
                <Chip style={{ backgroundColor: getRoleBadgeColor(item.role) }} textStyle={{ color: 'white' }}>
                  {getRoleText(item.role)}
                </Chip>
                <Chip 
                  style={{ backgroundColor: getStatusColor(item.status) + '20', marginLeft: 8 }}
                  textStyle={{ color: getStatusColor(item.status) }}
                >
                  {getStatusText(item.status)}
                </Chip>
              </View>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#9CA3AF" />
        </View>
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <Button 
          mode="text" 
          onPress={() => handleUserSelect(item)}
        >
          Detaylar
        </Button>
        <Button 
          mode="text" 
          onPress={() => handleStatusToggle(item)}
          textColor={item.status === 'active' ? '#EF4444' : '#10B981'}
        >
          {item.status === 'active' ? 'Pasif Yap' : 'Aktif Yap'}
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <RoleBasedRoute allowedRoles={['admin', 'manager']} currentUser={currentUser}>
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Kullanıcı Yönetimi" />
          <Appbar.Action icon="magnify" onPress={() => {}} />
        </Appbar.Header>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Kullanıcılar yükleniyor...</Text>
          </View>
        ) : (
          <FlatList
            data={users}
            renderItem={renderUserCard}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="account-off-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>Hiç kullanıcı bulunamadı</Text>
              </View>
            }
          />
        )}

        <FAB
          style={styles.fab}
          icon="plus"
          onPress={() => {
            setSelectedUser({
              id: '',
              email: '',
              name: '',
              role: 'field_user',
              region_id: null,
              status: 'active'
            });
            setEditMode(true);
            setShowUserModal(true);
          }}
        />

        <Portal>
          <Modal
            visible={showUserModal}
            onDismiss={() => setShowUserModal(false)}
            contentContainerStyle={styles.modalContent}
          >
            {selectedUser && (
              <>
                <View style={styles.modalHeader}>
                  <Avatar.Text 
                    size={64} 
                    label={selectedUser.name.substring(0, 2).toUpperCase()} 
                    style={{ backgroundColor: getRoleBadgeColor(selectedUser.role) }}
                  />
                  <Text style={styles.modalTitle}>
                    {editMode ? 'Kullanıcı Düzenle' : selectedUser.name}
                  </Text>
                  {!editMode && (
                    <Text style={styles.modalEmail}>{selectedUser.email}</Text>
                  )}
                </View>

                <Divider style={styles.divider} />

                {editMode ? (
                  <View style={styles.editForm}>
                    <Text style={styles.inputLabel}>İsim</Text>
                    <TextInput
                      value={selectedUser.name}
                      onChangeText={text => setSelectedUser({ ...selectedUser, name: text })}
                      style={styles.input}
                      mode="outlined"
                    />

                    <Text style={styles.inputLabel}>Rol</Text>
                    <View style={styles.roleButtons}>
                      {(['admin', 'manager', 'regional_manager', 'field_user'] as UserRole[]).map(role => (
                        <Chip
                          key={role}
                          selected={selectedUser.role === role}
                          onPress={() => setSelectedUser({ ...selectedUser, role })}
                          style={[
                            styles.roleChip,
                            selectedUser.role === role && { backgroundColor: getRoleBadgeColor(role) }
                          ]}
                          textStyle={selectedUser.role === role ? { color: 'white' } : {}}
                        >
                          {getRoleText(role)}
                        </Chip>
                      ))}
                    </View>

                    <View style={styles.buttonContainer}>
                      <Button 
                        mode="outlined" 
                        onPress={() => setShowUserModal(false)} 
                        style={styles.button}
                      >
                        İptal
                      </Button>
                      <Button 
                        mode="contained" 
                        onPress={handleUserUpdate} 
                        style={styles.button}
                      >
                        Kaydet
                      </Button>
                    </View>
                  </View>
                ) : (
                  <View style={styles.detailsContainer}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Rol:</Text>
                      <Chip style={{ backgroundColor: getRoleBadgeColor(selectedUser.role) + '20' }}
                        textStyle={{ color: getRoleBadgeColor(selectedUser.role) }}>
                        {getRoleText(selectedUser.role)}
                      </Chip>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Durum:</Text>
                      <Chip style={{ backgroundColor: getStatusColor(selectedUser.status) + '20' }}
                        textStyle={{ color: getStatusColor(selectedUser.status) }}>
                        {getStatusText(selectedUser.status)}
                      </Chip>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Bölge ID:</Text>
                      <Text style={styles.detailValue}>{selectedUser.region_id || 'Bölge Atanmamış'}</Text>
                    </View>

                    <View style={styles.buttonContainer}>
                      <Button 
                        mode="outlined" 
                        onPress={() => setShowUserModal(false)} 
                        style={styles.button}
                      >
                        Kapat
                      </Button>
                      <Button 
                        mode="contained" 
                        onPress={() => setEditMode(true)} 
                        style={styles.button}
                        icon="pencil"
                      >
                        Düzenle
                      </Button>
                    </View>
                  </View>
                )}
              </>
            )}
          </Modal>
        </Portal>
      </View>
    </RoleBasedRoute>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80, // FAB için boşluk
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userDetails: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    justifyContent: 'flex-end',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 0,
    margin: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#111827',
  },
  modalEmail: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  detailsContainer: {
    padding: 24,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B5563',
    width: 100,
  },
  detailValue: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  editForm: {
    padding: 24,
  },
  inputLabel: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
  },
  roleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  roleChip: {
    margin: 4,
  },
}); 