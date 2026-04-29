import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CustomButton from '@/components/common/CustomButton';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAuth } from '@/hooks/useAuth';
import { Competency } from '@/models/Competency';
import { getAllCompetencies } from '@/services/competencyService';
import { updateUser } from '@/services/userService';

export default function ManageCompetenciesScreen() {
  const { appUser, refreshAppUser } = useAuth();

  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>('FIRST_AID');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCompetencies();
  }, []);

  const loadCompetencies = async () => {
    const data = await getAllCompetencies();
    setCompetencies(data);

    if (appUser) {
      setSelectedIds(appUser.competencyIds);
    }
  };

  if (!appUser) return null;

  const programs = [...new Set(competencies.map(c => c.program))];

  const filtered = competencies.filter(c => c.program === selectedProgram);

  const toggleCompetency = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      await updateUser(appUser.id, {
        competencyIds: selectedIds,
      });

      await refreshAppUser();

      router.back();
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Kompetencije</Text>

        <Text style={styles.subtitle}>
          Izaberite program i označite nivoe koje posedujete.
        </Text>

        {/* PROGRAMI */}
        <View style={styles.programContainer}>
          {programs.map(program => (
            <Pressable
              key={program}
              style={[
                styles.programItem,
                selectedProgram === program && styles.programItemActive,
              ]}
              onPress={() => setSelectedProgram(program)}
            >
              <Text
                style={[
                  styles.programText,
                  selectedProgram === program && styles.programTextActive,
                ]}
              >
                {formatProgram(program)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* NIVOI */}
        <View style={styles.levelContainer}>
          {filtered.map(c => {
            const selected = selectedIds.includes(c.id);

            return (
              <Pressable
                key={c.id}
                style={[
                  styles.levelItem,
                  selected && styles.levelItemSelected,
                ]}
                onPress={() => toggleCompetency(c.id)}
              >
                <Text
                  style={[
                    styles.levelText,
                    selected && styles.levelTextSelected,
                  ]}
                >
                  {c.level}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.count}>
          Izabrano: {selectedIds.length}
        </Text>

        <CustomButton
          title="Sačuvaj kompetencije"
          onPress={handleSave}
          loading={loading}
        />

        <View style={{ height: Spacing.md }} />

        <CustomButton title="Nazad" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

/* ---------- HELPERS ---------- */

function formatProgram(program: string) {
  switch (program) {
    case 'FIRST_AID':
      return 'Prva pomoć';
    case 'PHV':
      return 'PHV';
    case 'DRR':
      return 'DRR';
    case 'ANTITRAFFICKING':
      return 'Antitrafficking';
    case 'HEALTH':
      return 'Zdravlje';
    case 'LIFESAVING':
      return 'Lifesaving';
    case 'DUN':
      return 'DUN';
    default:
      return program;
  }
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },

  programContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  programItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  programItemActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  programText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  programTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },

  levelContainer: {
    marginBottom: Spacing.lg,
  },
  levelItem: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  levelItemSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  levelText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  levelTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },

  count: {
    textAlign: 'center',
    marginBottom: Spacing.md,
    color: Colors.textSecondary,
  },
});