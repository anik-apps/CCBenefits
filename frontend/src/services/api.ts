import axios from 'axios';
import type {
  CardTemplateListItem,
  CardTemplateDetail,
  UserCardOut,
  UserCardDetail,
  UserCardSummary,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
});

export async function getCardTemplates(): Promise<CardTemplateListItem[]> {
  const { data } = await api.get('/api/card-templates');
  return data;
}

export async function getCardTemplate(id: number): Promise<CardTemplateDetail> {
  const { data } = await api.get(`/api/card-templates/${id}`);
  return data;
}

export async function getUserCards(): Promise<UserCardSummary[]> {
  const { data } = await api.get('/api/user-cards/');
  return data;
}

export async function getUserCard(id: number): Promise<UserCardDetail> {
  const { data } = await api.get(`/api/user-cards/${id}`);
  return data;
}

export async function getUserCardSummary(id: number): Promise<UserCardSummary> {
  const { data } = await api.get(`/api/user-cards/${id}/summary`);
  return data;
}

export async function createUserCard(cardTemplateId: number, nickname?: string): Promise<UserCardOut> {
  const { data } = await api.post('/api/user-cards/', {
    card_template_id: cardTemplateId,
    nickname: nickname || null,
  });
  return data;
}

export async function deleteUserCard(id: number): Promise<void> {
  await api.delete(`/api/user-cards/${id}`);
}

export async function logUsage(
  userCardId: number,
  benefitTemplateId: number,
  amountUsed: number,
  notes?: string,
  targetDate?: string,
): Promise<void> {
  await api.post(`/api/user-cards/${userCardId}/usage`, {
    benefit_template_id: benefitTemplateId,
    amount_used: amountUsed,
    notes: notes || null,
    target_date: targetDate || null,
  });
}

export async function updateUsage(
  usageId: number,
  amountUsed?: number,
  notes?: string,
): Promise<void> {
  await api.put(`/api/usage/${usageId}`, {
    amount_used: amountUsed,
    notes: notes,
  });
}

export async function deleteUsage(usageId: number): Promise<void> {
  await api.delete(`/api/usage/${usageId}`);
}

export async function updateBenefitSetting(
  userCardId: number,
  benefitTemplateId: number,
  perceivedMaxValue: number,
): Promise<void> {
  await api.put(`/api/user-cards/${userCardId}/benefits/${benefitTemplateId}/setting`, {
    perceived_max_value: perceivedMaxValue,
  });
}
