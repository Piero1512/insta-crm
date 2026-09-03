// app/leads/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import ConfirmModal from '@/components/ConfirmModal';
import { supabase } from '@/lib/supabase';
import { Lead, County, LeadSource, LeadTemperature, LeadStatus, SiteVisit, Quote } from '@/types/crm';
import { calculateScore } from '@/lib/scoring';
import { playNotificationSound } from '@/lib/audio';
import { 
  Phone, 
  PhoneCall,
  PhoneOff,
  PhoneForwarded,
  MessageSquare, 
  Plus, 
  MapPin, 
  Search, 
  Filter, 
  RotateCcw, 
  Edit2, 
  Trash2,
  Flame,
  Share2,
  CalendarPlus,
  Navigation,
  CheckCircle2,
  Camera,
  AlertCircle,
  BellRing,
  Send,
  LayoutList,
  KanbanSquare,
  Users,
  CheckCheck,
  TrendingUp,
  FileText,
  Clock,
  ExternalLink,
  DollarSign,
  Gift,
  Sparkles,
  MessageCircle,
  X
} from 'lucide-react';

interface CoordinatorOption {
  id: string;
  full_name: string;
  role: string;
}

interface LeadNote {
  id: string;
  lead_id: string;
  author_name: string;
  note: string;
  created_at: string;
}

const KANBAN_STAGES: { id: LeadStatus; label: string; color: string; border: string }[] = [
  { id: 'nuevo', label: 'Nuevos Leads', color: 'bg-blue-50 text-blue-700', border: 'border-blue-200' },
  { id: 'en_seguimiento', label: 'Protocolo 4+4', color: 'bg-amber-50 text-amber-700', border: 'border-amber-200' },
  { id: 'visita_realizada', label: 'Visita / Terreno', color: 'bg-purple-50 text-purple-700', border: 'border-purple-200' },
  { id: 'presupuestado', label: 'Presupuestados', color: 'bg-indigo-50 text-indigo-700', border: 'border-indigo-200' },
  { id: 'cerrado_ganado', label: 'Ganados (Obras)', color: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-200' },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [coordinators, setCoordinators] = useState<CoordinatorOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Vistas: 'table' | 'kanban' | 'retention'
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'retention'>('table');
  
  // Drag and drop
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStatus | null>(null);

  // Alerta Realtime
  const [newLeadBanner, setNewLeadBanner] = useState<string | null>(null);

  // Modales generales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal Registro Verificado de Llamada (Call Outcome)
  const [callModalLead, setCallModalLead] = useState<Lead | null>(null);
  const [callOutcome, setCallOutcome] = useState<'connected' | 'voicemail' | 'no_answer' | 'wrong_number'>('connected');
  const [callNotes, setCallNotes] = useState('');
  const [savingCall, setSavingCall] = useState(false);

  // Modal Envío WhatsApp
  const [whatsAppLead, setWhatsAppLead] = useState<Lead | null>(null);
  const [waCountryPrefix, setWaCountryPrefix] = useState('+1');
  const [waCustomPhone, setWaCustomPhone] = useState('');
  const [waMessageBody, setWaMessageBody] = useState('');

  // Modal Verificación WhatsApp (Message Outcome)
  const [waConfirmLead, setWaConfirmLead] = useState<Lead | null>(null);
  const [waOutcome, setWaOutcome] = useState<'sent' | 'replied' | 'failed'>('sent');
  const [waNotes, setWaNotes] = useState('');
  const [savingWaOutcome, setSavingWaOutcome] = useState(false);

  // Ficha 360° / Drawer lateral
  const [selectedLead360, setSelectedLead360] = useState<Lead | null>(null);
  const [leadNotes, setLeadNotes] = useState<LeadNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [leadVisits, setLeadVisits] = useState<SiteVisit[]>([]);
  const [leadQuotes, setLeadQuotes] = useState<Quote[]>([]);

  // Modal Visita Express
  const [quickVisitLead, setQuickVisitLead] = useState<Lead | null>(null);
  const [quickNotes, setQuickNotes] = useState('');
  const [quickLat, setQuickLat] = useState<number | null>(null);
  const [quickLng, setQuickLng] = useState<number | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [quickGpsError, setQuickGpsError] = useState('');
  const [quickFiles, setQuickFiles] = useState<File[]>([]);
  const [savingQuickVisit, setSavingQuickVisit] = useState(false);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCounty, setFilterCounty] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCoordinator, setFilterCoordinator] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  // Formulario Crear Lead
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [serviceType, setServiceType] = useState('Remodelación de Baño');
  const [locationCounty, setLocationCounty] = useState<County>('miami-dade');
  const [zipCode, setZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [leadSource, setLeadSource] = useState<LeadSource>('meta_ads');
  const [budgetRange, setBudgetRange] = useState<string>('5k-15k');

  // Formulario Editar Lead
  const [editClientName, setEditClientName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editServiceType, setEditServiceType] = useState('');
  const [editLocationCounty, setEditLocationCounty] = useState<County>('miami-dade');
  const [editZipCode, setEditZipCode] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editLeadSource, setEditLeadSource] = useState<LeadSource>('directo');
  const [editBudgetRange, setEditBudgetRange] = useState<string>('no_especificado');

  const fetchData = async () => {
    setLoading(true);
    const [{ data: leadsData }, { data: profilesData }] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, role').order('full_name', { ascending: true })
    ]);
    if (leadsData) setLeads(leadsData);
    if (profilesData) setCoordinators(profilesData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('public:leads_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        (payload) => {
          const newRecord = payload.new as Lead;
          setLeads((prev) => [newRecord, ...prev]);
          playNotificationSound();
          setNewLeadBanner(`¡Nuevo Lead Recibido! ${newRecord.client_name} (${newRecord.service_type})`);
          setTimeout(() => setNewLeadBanner(null), 8000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- LLAMADA VERIFICADA ---
  const handleTriggerCall = (lead: Lead) => {
    const cleanNumber = lead.phone.replace(/\D/g, '');
    window.location.href = `tel:${cleanNumber}`;
    setCallModalLead(lead);
    setCallOutcome('connected');
    setCallNotes('');
  };

  const handleSaveCallOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callModalLead) return;

    setSavingCall(true);

    const isCountableCall = callOutcome === 'connected' || callOutcome === 'voicemail' || callOutcome === 'no_answer';
    const newCallsCount = isCountableCall && callModalLead.calls_count < 4 
      ? callModalLead.calls_count + 1 
      : callModalLead.calls_count;

    let outcomeText = '';
    switch (callOutcome) {
      case 'connected': outcomeText = 'Llamada Contestada / Conversación'; break;
      case 'voicemail': outcomeText = 'Llamada a Buzón de Voz'; break;
      case 'no_answer': outcomeText = 'Llamada no contestada'; break;
      case 'wrong_number': outcomeText = 'Número equivocado o inválido'; break;
    }

    const finalNote = `📞 [${outcomeText}]${callNotes ? ` - Detalle: ${callNotes}` : ''}`;
    await supabase.from('lead_notes').insert([
      {
        lead_id: callModalLead.id,
        author_name: 'Coordinador',
        note: finalNote,
      }
    ]);

    const { score, temperature } = calculateScore({
      service_type: callModalLead.service_type,
      location_county: callModalLead.location_county,
      budget_range: callModalLead.budget_range,
      calls_count: newCallsCount,
      messages_count: callModalLead.messages_count,
    });

    const updateData = {
      calls_count: newCallsCount,
      status: (callModalLead.status === 'nuevo' ? 'en_seguimiento' : callModalLead.status) as LeadStatus,
      lead_score: score,
      temperature: temperature,
    };

    const { error } = await supabase.from('leads').update(updateData).eq('id', callModalLead.id);
    if (!error) {
      setLeads((prev) => prev.map((l) => (l.id === callModalLead.id ? { ...l, ...updateData } : l)));
    }

    setSavingCall(false);
    setCallModalLead(null);
  };

  // --- WHATSAPP: PASO 1 (ABRIR CHAT) ---
  const handleOpenWhatsAppModal = (lead: Lead, customMessage?: string) => {
    setWhatsAppLead(lead);
    const raw = lead.phone.trim();
    if (raw.startsWith('+57')) {
      setWaCountryPrefix('+57');
      setWaCustomPhone(raw.replace('+57', '').trim());
    } else if (raw.startsWith('+52')) {
      setWaCountryPrefix('+52');
      setWaCustomPhone(raw.replace('+52', '').trim());
    } else if (raw.startsWith('+34')) {
      setWaCountryPrefix('+34');
      setWaCustomPhone(raw.replace('+34', '').trim());
    } else if (raw.startsWith('+1')) {
      setWaCountryPrefix('+1');
      setWaCustomPhone(raw.replace('+1', '').trim());
    } else {
      setWaCountryPrefix('+1');
      setWaCustomPhone(raw);
    }

    if (customMessage) {
      setWaMessageBody(customMessage);
    } else {
      setWaMessageBody(
        `Hola ${lead.client_name}, le saludamos de Insta CRM Florida Contractors. Recibimos su solicitud para ${lead.service_type}. ¿A qué hora le resultaría conveniente coordinar una breve llamada o visita técnica a su propiedad?`
      );
    }
  };

  const handleLaunchWhatsApp = () => {
    if (!whatsAppLead) return;
    const cleanNumber = waCustomPhone.replace(/\D/g, '');
    const cleanPrefix = waCountryPrefix.replace(/\D/g, '');
    const fullPhoneNumber = cleanPrefix ? `${cleanPrefix}${cleanNumber}` : cleanNumber;

    // 1. Abrir WhatsApp Web o App
    window.open(`https://wa.me/${fullPhoneNumber}?text=${encodeURIComponent(waMessageBody)}`, '_blank');

    // 2. Abrir Modal de Confirmación Verificada y cerrar modal de redacción
    const currentLead = whatsAppLead;
    setWhatsAppLead(null);
    setWaConfirmLead(currentLead);
    setWaOutcome('sent');
    setWaNotes('');
  };

  // --- WHATSAPP: PASO 2 (CONFIRMAR RESULTADO) ---
  const handleSaveWaOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waConfirmLead) return;

    setSavingWaOutcome(true);

    const isCountable = waOutcome === 'sent' || waOutcome === 'replied';
    const newMessagesCount = isCountable && waConfirmLead.messages_count < 4
      ? waConfirmLead.messages_count + 1
      : waConfirmLead.messages_count;

    let outcomeText = '';
    switch (waOutcome) {
      case 'sent': outcomeText = 'Mensaje de WhatsApp Enviado y Entregado'; break;
      case 'replied': outcomeText = 'Conversación Activa / Cliente Respondió'; break;
      case 'failed': outcomeText = 'No se envió / Número sin WhatsApp'; break;
    }

    // 1. Guardar en bitácora de notas
    const finalNote = `💬 [WhatsApp: ${outcomeText}]${waNotes ? ` - Detalle: ${waNotes}` : ''}`;
    await supabase.from('lead_notes').insert([
      {
        lead_id: waConfirmLead.id,
        author_name: 'Coordinador',
        note: finalNote,
      }
    ]);

    // 2. Si se envió o respondió, actualizar contador y score
    if (isCountable) {
      const { score, temperature } = calculateScore({
        service_type: waConfirmLead.service_type,
        location_county: waConfirmLead.location_county,
        budget_range: waConfirmLead.budget_range,
        calls_count: waConfirmLead.calls_count,
        messages_count: newMessagesCount,
      });

      const updateData = {
        messages_count: newMessagesCount,
        status: (waConfirmLead.status === 'nuevo' ? 'en_seguimiento' : waConfirmLead.status) as LeadStatus,
        lead_score: score,
        temperature: waOutcome === 'replied' ? ('caliente' as LeadTemperature) : temperature,
      };

      const { error } = await supabase.from('leads').update(updateData).eq('id', waConfirmLead.id);
      if (!error) {
        setLeads((prev) => prev.map((l) => (l.id === waConfirmLead.id ? { ...l, ...updateData } : l)));
      }
    }

    setSavingWaOutcome(false);
    setWaConfirmLead(null);
  };

  // Carga de Ficha 360°
  const handleOpen360 = async (lead: Lead) => {
    setSelectedLead360(lead);
    setLoadingNotes(true);
    setNewNoteText('');

    const [{ data: notesData }, { data: visitsData }, { data: quotesData }] = await Promise.all([
      supabase.from('lead_notes').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }),
      supabase.from('site_visits').select('*').eq('lead_id', lead.id).order('visited_at', { ascending: false }),
      supabase.from('quotes').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }),
    ]);

    if (notesData) setLeadNotes(notesData);
    if (visitsData) setLeadVisits(visitsData);
    if (quotesData) setLeadQuotes(quotesData);
    setLoadingNotes(false);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead360 || !newNoteText.trim()) return;

    const { data, error } = await supabase.from('lead_notes').insert([
      {
        lead_id: selectedLead360.id,
        author_name: 'Coordinador',
        note: newNoteText.trim(),
      }
    ]).select().single();

    if (!error && data) {
      setLeadNotes((prev) => [data, ...prev]);
      setNewNoteText('');
    } else if (error) {
      alert('Error al guardar nota: ' + error.message);
    }
  };

  // KPIs superiores
  const kpis = useMemo(() => {
    const total = leads.length;
    const hotCount = leads.filter((l) => l.temperature === 'caliente' || (l.lead_score || 0) >= 70).length;
    const protocolDone = leads.filter((l) => l.calls_count >= 4 && l.messages_count >= 4).length;
    const wonList = leads.filter((l) => l.status === 'cerrado_ganado');
    return { total, hotCount, protocolDone, wonCount: wonList.length };
  }, [leads]);

  // Mover etapa en Kanban
  const handleMoveStage = async (leadId: string, newStatus: LeadStatus) => {
    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', leadId);
    if (!error) {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
    }
  };

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageId: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stageId) setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: LeadStatus) => {
    e.preventDefault();
    setDragOverStage(null);
    const leadId = draggedLeadId || e.dataTransfer.getData('text/plain');
    if (!leadId) return;

    await handleMoveStage(leadId, targetStage);
    setDraggedLeadId(null);
  };

  // Visita Express
  const handleOpenQuickVisit = (lead: Lead) => {
    setQuickVisitLead(lead);
    setQuickNotes('');
    setQuickFiles([]);
    setQuickGpsError('');
    setQuickLat(null);
    setQuickLng(null);
    handleGetQuickLocation();
  };

  const handleGetQuickLocation = () => {
    setGettingLocation(true);
    setQuickGpsError('');
    if (!navigator.geolocation) {
      setQuickGpsError('Geolocalización no disponible');
      setGettingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setQuickLat(pos.coords.latitude);
        setQuickLng(pos.coords.longitude);
        setGettingLocation(false);
      },
      (err) => {
        setQuickGpsError('Error GPS: ' + err.message);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveQuickVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickVisitLead || !quickLat || !quickLng) {
      alert('La coordenada GPS satelital es obligatoria.');
      return;
    }

    setSavingQuickVisit(true);
    const photoUrls: string[] = [];

    for (const file of quickFiles) {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `visits/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('visit-photos').upload(filePath, file);
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('visit-photos').getPublicUrl(filePath);
        photoUrls.push(publicUrl);
      }
    }

    const { error: visitError } = await supabase.from('site_visits').insert([
      {
        lead_id: quickVisitLead.id,
        latitude: quickLat,
        longitude: quickLng,
        evaluation_notes: quickNotes || 'Inspección técnica rápida registrada desde la bandeja.',
        visited_at: new Date().toISOString(),
        photos: photoUrls,
      }
    ]);

    if (visitError) {
      alert('Error al registrar visita: ' + visitError.message);
      setSavingQuickVisit(false);
      return;
    }

    await supabase.from('leads').update({ status: 'visita_realizada' }).eq('id', quickVisitLead.id);
    setSavingQuickVisit(false);
    setQuickVisitLead(null);
    fetchData();
  };

  // Crear Lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();

    const { score, temperature } = calculateScore({
      service_type: serviceType,
      location_county: locationCounty,
      budget_range: budgetRange,
      calls_count: 0,
      messages_count: 0,
    });

    const { error } = await supabase.from('leads').insert([
      {
        client_name: clientName,
        phone,
        email: email || null,
        service_type: serviceType,
        location_county: locationCounty,
        zip_code: zipCode,
        address,
        assigned_to: assignedTo || null,
        status: 'nuevo',
        calls_count: 0,
        messages_count: 0,
        lead_source: leadSource,
        budget_range: budgetRange,
        lead_score: score,
        temperature: temperature,
      },
    ]);

    if (error) {
      alert('Error al registrar lead: ' + error.message);
      return;
    }

    setIsCreateModalOpen(false);
    setClientName('');
    setPhone('');
    setEmail('');
    setZipCode('');
    setAddress('');
    setAssignedTo('');
    fetchData();
  };

  const handleOpenEdit = (lead: Lead) => {
    setEditingLead(lead);
    setEditClientName(lead.client_name);
    setEditPhone(lead.phone);
    setEditEmail(lead.email || '');
    setEditServiceType(lead.service_type);
    setEditLocationCounty(lead.location_county);
    setEditZipCode(lead.zip_code || '');
    setEditAddress(lead.address || '');
    setEditAssignedTo(lead.assigned_to || '');
    setEditLeadSource(lead.lead_source || 'directo');
    setEditBudgetRange(lead.budget_range || 'no_especificado');
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;

    const { score, temperature } = calculateScore({
      service_type: editServiceType,
      location_county: editLocationCounty,
      budget_range: editBudgetRange,
      calls_count: editingLead.calls_count,
      messages_count: editingLead.messages_count,
    });

    const { error } = await supabase
      .from('leads')
      .update({
        client_name: editClientName,
        phone: editPhone,
        email: editEmail,
        service_type: editServiceType,
        location_county: editLocationCounty,
        zip_code: editZipCode,
        address: editAddress,
        assigned_to: editAssignedTo || null,
        lead_source: editLeadSource,
        budget_range: editBudgetRange,
        lead_score: score,
        temperature: temperature,
      })
      .eq('id', editingLead.id);

    if (error) {
      alert('Error al actualizar: ' + error.message);
      return;
    }
    setEditingLead(null);
    fetchData();
  };

  const handleConfirmDeleteLead = async () => {
    if (!leadToDelete) return;
    setIsDeleting(true);
    const { error } = await supabase.from('leads').delete().eq('id', leadToDelete.id);
    setIsDeleting(false);
    if (error) {
      alert('Error al eliminar: ' + error.message);
    } else {
      setLeads((prev) => prev.filter((l) => l.id !== leadToDelete.id));
      setLeadToDelete(null);
    }
  };

  // Filtrado
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        query === '' ||
        lead.client_name?.toLowerCase().includes(query) ||
        lead.phone?.toLowerCase().includes(query) ||
        lead.service_type?.toLowerCase().includes(query) ||
        lead.zip_code?.toLowerCase().includes(query) ||
        lead.address?.toLowerCase().includes(query);

      const matchesCounty = filterCounty === 'all' || lead.location_county === filterCounty;
      const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
      const matchesCoordinator =
        filterCoordinator === 'all' ||
        (filterCoordinator === 'unassigned' ? !lead.assigned_to : lead.assigned_to === filterCoordinator);
      const matchesSource = filterSource === 'all' || lead.lead_source === filterSource;

      return matchesSearch && matchesCounty && matchesStatus && matchesCoordinator && matchesSource;
    });
  }, [leads, searchQuery, filterCounty, filterStatus, filterCoordinator, filterSource]);

  const wonClients = useMemo(() => {
    return leads.filter((l) => l.status === 'cerrado_ganado');
  }, [leads]);

  const resetFilters = () => {
    setSearchQuery('');
    setFilterCounty('all');
    setFilterStatus('all');
    setFilterCoordinator('all');
    setFilterSource('all');
  };

  const hasActiveFilters = searchQuery !== '' || filterCounty !== 'all' || filterStatus !== 'all' || filterCoordinator !== 'all' || filterSource !== 'all';

  const getTemperatureBadge = (temp?: LeadTemperature, score?: number) => {
    const finalScore = score || 10;
    if (temp === 'caliente' || finalScore >= 70) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <Flame className="w-3 h-3 text-rose-500 fill-rose-500" />
          Caliente ({finalScore})
        </span>
      );
    }
    if (temp === 'tibio' || finalScore >= 40) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Flame className="w-3 h-3 text-amber-500" />
          Tibio ({finalScore})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
        Frío ({finalScore})
      </span>
    );
  };

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'google_ads':
        return <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">Google Ads</span>;
      case 'meta_ads':
        return <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">Meta Ads</span>;
      case 'landing_page':
        return <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Web / Form</span>;
      case 'referido':
        return <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">Referido</span>;
      default:
        return <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Directo</span>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Banner Realtime */}
        {newLeadBanner && (
          <div className="bg-blue-600 text-white p-3.5 rounded-xl shadow-lg flex items-center justify-between animate-bounce">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
              <BellRing className="w-5 h-5 text-amber-300 shrink-0" />
              <span>{newLeadBanner}</span>
            </div>
            <button onClick={() => setNewLeadBanner(null)} className="text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Cabecera Principal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Leads & Pipeline</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Gestión comercial con registro verificado de llamadas y WhatsApp, Ficha 360° y Retención LTV
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 border border-slate-300">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Lista</span>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'kanban' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <KanbanSquare className="w-3.5 h-3.5" />
                <span>Pipeline Drag&Drop</span>
              </button>
              <button
                onClick={() => setViewMode('retention')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'retention' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Retención (LTV)</span>
              </button>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex justify-center items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo Lead
            </button>
          </div>
        </div>

        {/* 4 RECUADROS MÉTRICOS SUPERIORES */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Total Leads</p>
              <h4 className="text-xl sm:text-2xl font-bold text-slate-800">{kpis.total}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <Flame className="w-5 h-5 fill-rose-500 text-rose-500" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Leads Calientes</p>
              <h4 className="text-xl sm:text-2xl font-bold text-slate-800">{kpis.hotCount}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Protocolo 4+4 Full</p>
              <h4 className="text-xl sm:text-2xl font-bold text-slate-800">{kpis.protocolDone}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Obras Ganadas (LTV)</p>
              <h4 className="text-xl sm:text-2xl font-bold text-emerald-600">{kpis.wonCount}</h4>
            </div>
          </div>
        </div>

        {/* Filtros */}
        {viewMode !== 'retention' && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                Filtros Multicriterio & Segmentación
              </span>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Limpiar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar cliente, tel, zip..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                />
              </div>

              <div>
                <select
                  value={filterCounty}
                  onChange={(e) => setFilterCounty(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                >
                  <option value="all">Condado: Todos</option>
                  <option value="miami-dade">Miami-Dade</option>
                  <option value="broward">Broward</option>
                  <option value="palm beach">Palm Beach</option>
                </select>
              </div>

              <div>
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                >
                  <option value="all">Canal: Todos</option>
                  <option value="meta_ads">Meta Ads</option>
                  <option value="google_ads">Google Ads</option>
                  <option value="landing_page">Web / Form</option>
                  <option value="referido">Referido</option>
                  <option value="directo">Directo</option>
                </select>
              </div>

              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                >
                  <option value="all">Estado: Todos</option>
                  <option value="nuevo">Nuevo</option>
                  <option value="en_seguimiento">En Seguimiento</option>
                  <option value="visita_realizada">Visita Realizada</option>
                  <option value="presupuestado">Presupuestado</option>
                  <option value="cerrado_ganado">Cerrado Ganado</option>
                  <option value="cerrado_perdido">Cerrado Perdido</option>
                </select>
              </div>

              <div>
                <select
                  value={filterCoordinator}
                  onChange={(e) => setFilterCoordinator(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                >
                  <option value="all">Asignación: Todos</option>
                  <option value="unassigned">Sin Asignar</option>
                  {coordinators.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* --- VISTA 1: TABLA --- */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Bandeja Inteligente de Leads</h3>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                {filteredLeads.length} Prospectos
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Cliente / Contacto</th>
                    <th className="py-3 px-4">Origen & Temperatura</th>
                    <th className="py-3 px-4">Ubicación</th>
                    <th className="py-3 px-4">Seguimiento 4+4</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-center">Visita Express</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Cargando prospectos...
                      </td>
                    </tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No se encontraron prospectos con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleOpen360(lead)}
                            className="text-left group focus:outline-none"
                            title="Ver Ficha 360° del Prospecto"
                          >
                            <div className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                              <span>{lead.client_name}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span>{lead.service_type}</span>
                              <span>•</span>
                              <span className="font-medium text-slate-700">{lead.phone}</span>
                            </div>
                          </button>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            {getTemperatureBadge(lead.temperature, lead.lead_score)}
                            {getSourceBadge(lead.lead_source)}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-xs font-medium text-slate-700 flex items-center gap-1 capitalize">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {lead.location_county} {lead.zip_code && `(${lead.zip_code})`}
                          </div>
                          {lead.budget_range && lead.budget_range !== 'no_especificado' && (
                            <span className="text-[11px] text-slate-400">Presupuesto: {lead.budget_range}</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`px-2 py-0.5 rounded font-semibold ${lead.calls_count >= 4 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                              📞 {lead.calls_count}/4
                            </span>
                            <span className={`px-2 py-0.5 rounded font-semibold ${lead.messages_count >= 4 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                              💬 {lead.messages_count}/4
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="capitalize px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                            {lead.status.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleOpenQuickVisit(lead)}
                            title="Reportar inspección técnica GPS para este lead"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors border border-indigo-200"
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                            <span>Visita</span>
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Botón WhatsApp con Verificación */}
                            <button
                              onClick={() => handleOpenWhatsAppModal(lead)}
                              title="Enviar WhatsApp con confirmación de entrega"
                              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                            >
                              <MessageSquare className="w-4 h-4 fill-emerald-100" />
                            </button>

                            {/* Botón Llamar con Verificación */}
                            <button
                              onClick={() => handleTriggerCall(lead)}
                              title="Llamar al cliente y registrar resultado"
                              className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Phone className="w-4 h-4 fill-blue-100" />
                            </button>

                            <button
                              onClick={() => handleOpenEdit(lead)}
                              title="Editar lead"
                              className="p-1.5 text-slate-500 hover:text-amber-600 rounded"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setLeadToDelete(lead)}
                              title="Eliminar lead"
                              className="p-1.5 text-slate-500 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- VISTA 2: PIPELINE KANBAN --- */}
        {viewMode === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
            {KANBAN_STAGES.map((stage) => {
              const stageLeads = filteredLeads.filter((l) => l.status === stage.id);
              const isOver = dragOverStage === stage.id;

              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => handleDragOver(e, stage.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage.id)}
                  className={`rounded-2xl p-3 border transition-all flex flex-col min-w-[260px] ${
                    isOver ? 'bg-blue-100/70 border-blue-400 ring-2 ring-blue-300' : 'bg-slate-100/80 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${stage.color} ${stage.border}`}>
                      {stage.label}
                    </span>
                    <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full shadow-xs">
                      {stageLeads.length}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                    {stageLeads.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                        Arrastra una tarjeta aquí
                      </div>
                    ) : (
                      stageLeads.map((lead) => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          className={`bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-2.5 ${
                            draggedLeadId === lead.id ? 'opacity-40 scale-95' : 'opacity-100'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <button
                              onClick={() => handleOpen360(lead)}
                              className="text-left group focus:outline-none"
                              title="Ver Ficha 360°"
                            >
                              <h4 className="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-blue-600 transition-colors">
                                {lead.client_name}
                              </h4>
                              <p className="text-[11px] text-slate-500 font-medium">{lead.service_type}</p>
                            </button>
                            {getTemperatureBadge(lead.temperature, lead.lead_score)}
                          </div>

                          <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-slate-100">
                            <span className="flex items-center gap-1 capitalize">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {lead.location_county}
                            </span>
                            <span className="font-semibold text-slate-700">{lead.phone}</span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                            <span className="text-slate-400 font-medium">4+4:</span>
                            <div className="flex gap-1.5 font-bold">
                              <span className={lead.calls_count >= 4 ? 'text-emerald-600' : 'text-slate-600'}>📞 {lead.calls_count}/4</span>
                              <span className={lead.messages_count >= 4 ? 'text-emerald-600' : 'text-slate-600'}>💬 {lead.messages_count}/4</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                            <button
                              onClick={() => handleTriggerCall(lead)}
                              className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Llamar al cliente"
                            >
                              <Phone className="w-3.5 h-3.5 fill-blue-100" />
                            </button>

                            <button
                              onClick={() => handleOpenWhatsAppModal(lead)}
                              className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                              title="Enviar WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5 fill-emerald-100" />
                            </button>

                            <select
                              value={lead.status}
                              onChange={(e) => handleMoveStage(lead.id, e.target.value as LeadStatus)}
                              className="text-[10px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 focus:outline-none flex-1"
                            >
                              <option value="nuevo">Mover a: Nuevo</option>
                              <option value="en_seguimiento">Mover a: Seguimiento</option>
                              <option value="visita_realizada">Mover a: Visita</option>
                              <option value="presupuestado">Mover a: Presupuesto</option>
                              <option value="cerrado_ganado">Mover a: Ganado</option>
                              <option value="cerrado_perdido">Mover a: Perdido</option>
                            </select>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* --- VISTA 3: RETENCIÓN & LTV --- */}
        {viewMode === 'retention' && (
          <div className="space-y-4">
            <div className="bg-emerald-900 text-white p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Gift className="w-5 h-5 text-emerald-300" />
                  Hub de Retención & LTV (Customer Lifetime Value)
                </h3>
                <p className="text-xs text-emerald-100 mt-1 max-w-2xl">
                  Dispara campañas de fidelización para clientes de obras ganadas. Mantenimiento y nuevos contratos.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-emerald-200 font-semibold uppercase">Cartera Ganada</span>
                <p className="text-2xl font-bold">{wonClients.length} Clientes</p>
              </div>
            </div>

            {wonClients.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
                <Sparkles className="w-8 h-8 text-amber-500 mx-auto" />
                <h4 className="font-bold text-slate-800">Aún no hay clientes en etapa Cerrado Ganado</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Arrastra o mueve un lead a la columna <strong>"Ganados (Obras)"</strong> en el Pipeline para activar sus campañas de retención.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {wonClients.map((client) => (
                  <div key={client.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{client.client_name}</h4>
                        <p className="text-xs text-slate-500">{client.service_type}</p>
                      </div>
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                        Cliente Ganado
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Teléfono:</span>
                        <span className="font-semibold">{client.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Condado:</span>
                        <span className="font-semibold capitalize">{client.location_county}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Presupuesto original:</span>
                        <span className="font-semibold">{client.budget_range || '$5k - $15k'}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Campañas de Reactivación WhatsApp
                      </span>

                      <button
                        onClick={() =>
                          handleOpenWhatsAppModal(
                            client,
                            `Hola ${client.client_name}, ¿cómo está todo? Le saluda el equipo de Insta CRM Florida Contractors. Queríamos saber cómo quedó todo con su obra de ${client.service_type}. Estamos ofreciendo una inspección preventiva de cortesía para nuestros clientes preferenciales. ¿Le gustaría que pasemos a revisar?`
                          )
                        }
                        className="w-full text-left p-2.5 bg-emerald-50/60 hover:bg-emerald-100/80 border border-emerald-200 rounded-xl transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <p className="font-bold text-emerald-900 text-xs">Mantenimiento Preventivo (6m)</p>
                          <span className="text-[10px] text-emerald-700">Revisión de garantía y satisfacción</span>
                        </div>
                        <Send className="w-3.5 h-3.5 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      <button
                        onClick={() =>
                          handleOpenWhatsAppModal(
                            client,
                            `Hola ${client.client_name}, un gusto saludarle nuevamente de Insta CRM Florida Contractors. Por ser cliente activo, tenemos un 10% de descuento en mano de obra para su próximo proyecto de remodelación, pisos, drywall o pintura antes del próximo mes. ¿Tiene algún área de su casa que le gustaría actualizar?`
                          )
                        }
                        className="w-full text-left p-2.5 bg-blue-50/60 hover:bg-blue-100/80 border border-blue-200 rounded-xl transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <p className="font-bold text-blue-900 text-xs">Descuento Cliente VIP (10%)</p>
                          <span className="text-[10px] text-blue-700">Incentivo para segunda remodelación</span>
                        </div>
                        <Send className="w-3.5 h-3.5 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- MODAL 1: REDACTAR Y ABRIR WHATSAPP --- */}
      {whatsAppLead && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-emerald-50/60">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                  Preparar WhatsApp para {whatsAppLead.client_name}
                </h3>
              </div>
              <button onClick={() => setWhatsAppLead(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1.5">
                  Prefijo de País & Número Celular
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={waCountryPrefix}
                    onChange={(e) => setWaCountryPrefix(e.target.value)}
                    className="px-2.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:outline-none"
                  >
                    <option value="+1">🇺🇸 +1 (USA/FL)</option>
                    <option value="+57">🇨🇴 +57 (Colombia)</option>
                    <option value="+52">🇲🇽 +52 (México)</option>
                    <option value="+34">🇪🇸 +34 (España)</option>
                    <option value="+58">🇻🇪 +58 (Venezuela)</option>
                    <option value="">Otro / Sin prefijo</option>
                  </select>
                  <input
                    type="text"
                    value={waCustomPhone}
                    onChange={(e) => setWaCustomPhone(e.target.value)}
                    placeholder="Número telefónico"
                    className="sm:col-span-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1.5">
                  Mensaje Personalizado
                </label>
                <textarea
                  rows={4}
                  value={waMessageBody}
                  onChange={(e) => setWaMessageBody(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 leading-relaxed text-xs"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWhatsAppLead(null)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleLaunchWhatsApp}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 text-xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Abrir WhatsApp Web / App</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: CONFIRMACIÓN Y REGISTRO VERIFICADO DE WHATSAPP --- */}
      {waConfirmLead && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-emerald-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Confirmar Envío de WhatsApp</h3>
                  <p className="text-xs text-slate-500">{waConfirmLead.client_name} • {waConfirmLead.phone}</p>
                </div>
              </div>
              <button onClick={() => setWaConfirmLead(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWaOutcome} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-2">
                  ¿Se entregó el mensaje en WhatsApp? *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setWaOutcome('sent')}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                      waOutcome === 'sent'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Enviado (+1)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWaOutcome('replied')}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                      waOutcome === 'replied'
                        ? 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-200 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span>Respondió (+1)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWaOutcome('failed')}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                      waOutcome === 'failed'
                        ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-200 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Falló / Cancelado</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Resumen o Comentarios de la Conversación (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={waNotes}
                  onChange={(e) => setWaNotes(e.target.value)}
                  placeholder="Ej. Cliente leyó el mensaje y pidió presupuesto por PDF..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWaConfirmLead(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Omitir Registro
                </button>
                <button
                  type="submit"
                  disabled={savingWaOutcome}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{savingWaOutcome ? 'Guardando...' : 'Confirmar & Registrar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL REGISTRO VERIFICADO DE LLAMADA (CALL OUTCOME) --- */}
      {callModalLead && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-blue-50/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                  <PhoneCall className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Registrar Resultado de Llamada</h3>
                  <p className="text-xs text-slate-500">{callModalLead.client_name} • {callModalLead.phone}</p>
                </div>
              </div>
              <button onClick={() => setCallModalLead(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCallOutcome} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-2">
                  ¿Qué sucedió en la llamada? *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCallOutcome('connected')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      callOutcome === 'connected'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Contestó</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal">Hablamos con el cliente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCallOutcome('voicemail')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      callOutcome === 'voicemail'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-200 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <PhoneForwarded className="w-3.5 h-3.5 text-amber-600" />
                      <span>Buzón de Voz</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal">Dejé recado de voz</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCallOutcome('no_answer')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      callOutcome === 'no_answer'
                        ? 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-200 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <PhoneOff className="w-3.5 h-3.5 text-blue-600" />
                      <span>No Contestó</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal">Repicó sin respuesta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCallOutcome('wrong_number')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      callOutcome === 'wrong_number'
                        ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-200 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Equivocado</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal">Número inválido</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Notas de la Llamada / Acuerdos (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Ej. Interesado en cambiar baldosas, llamar después de las 5 PM..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCallModalLead(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCall}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{savingCall ? 'Guardando...' : 'Confirmar & Registrar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- FICHA 360°: DRAWER LATERAL --- */}
      {selectedLead360 && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-lg">{selectedLead360.client_name}</h3>
                  {getTemperatureBadge(selectedLead360.temperature, selectedLead360.lead_score)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedLead360.service_type} • Creado el {new Date(selectedLead360.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedLead360(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Datos de Contacto & Proyecto
                </span>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400">Teléfono:</span>
                    <p className="font-bold text-slate-800">{selectedLead360.phone}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Correo:</span>
                    <p className="font-bold text-slate-800">{selectedLead360.email || 'No registrado'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Ubicación:</span>
                    <p className="font-bold text-slate-800 capitalize">
                      {selectedLead360.location_county} {selectedLead360.zip_code ? `(${selectedLead360.zip_code})` : ''}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Presupuesto estimado:</span>
                    <p className="font-bold text-slate-800">{selectedLead360.budget_range || 'No indicado'}</p>
                  </div>
                </div>
                {selectedLead360.address && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <span className="text-slate-400">Dirección:</span>
                    <p className="font-medium text-slate-800">{selectedLead360.address}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 mb-2.5">
                  <Navigation className="w-3.5 h-3.5 text-indigo-600" />
                  Inspecciones en Sitio ({leadVisits.length})
                </h4>

                {leadVisits.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-center">
                    No se han registrado visitas para este prospecto.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leadVisits.map((v) => (
                      <div key={v.id} className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-indigo-900">
                            GPS: {v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}
                          </span>
                          <span className="text-slate-500">{new Date(v.visited_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-700 font-medium">{v.evaluation_notes}</p>
                        {v.photos && v.photos.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pt-1">
                            {v.photos.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                <img src={url} alt="Evidencia" className="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-2xs hover:opacity-90" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 mb-2.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Cotizaciones Emitidas ({leadQuotes.length})
                </h4>

                {leadQuotes.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-center">
                    Sin presupuestos generados todavía.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leadQuotes.map((q) => (
                      <div key={q.id} className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-800">Total: ${q.total_amount.toLocaleString()}</p>
                          <span className="text-[10px] text-slate-500 capitalize">Estado: {q.status}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{new Date(q.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Bitácora Cronológica & Historial Multicanal
                </h4>

                <form onSubmit={handleAddNote} className="space-y-2">
                  <textarea
                    rows={2}
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Escribe una nota rápida de seguimiento..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!newNoteText.trim()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs text-xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Guardar Nota</span>
                    </button>
                  </div>
                </form>

                <div className="space-y-2.5 pt-2">
                  {loadingNotes ? (
                    <p className="text-slate-400 text-center py-2">Cargando historial...</p>
                  ) : leadNotes.length === 0 ? (
                    <p className="text-slate-400 text-center py-2">Sin anotaciones previas en la bitácora.</p>
                  ) : (
                    leadNotes.map((note) => (
                      <div key={note.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-bold text-slate-700">{note.author_name}</span>
                          <span>{new Date(note.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-700 font-medium text-xs leading-relaxed">{note.note}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  const target = selectedLead360;
                  setSelectedLead360(null);
                  handleTriggerCall(target);
                }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Llamar</span>
              </button>
              <button
                onClick={() => {
                  const target = selectedLead360;
                  setSelectedLead360(null);
                  handleOpenWhatsAppModal(target);
                }}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL VISITA EXPRESS (GPS) --- */}
      {quickVisitLead && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  <CalendarPlus className="w-4 h-4 text-indigo-600" />
                  Inspección Técnica en Terreno
                </h3>
                <p className="text-xs text-slate-500">
                  {quickVisitLead.client_name} • {quickVisitLead.service_type}
                </p>
              </div>
              <button onClick={() => setQuickVisitLead(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickVisit} className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                    Posición Satelital GPS
                  </span>
                  <button
                    type="button"
                    onClick={handleGetQuickLocation}
                    disabled={gettingLocation}
                    className="text-xs text-blue-600 hover:underline font-semibold disabled:text-slate-400"
                  >
                    {gettingLocation ? 'Capturando...' : 'Recalcular'}
                  </button>
                </div>

                {quickLat && quickLng ? (
                  <div className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Ubicación fijada: <strong>{quickLat.toFixed(5)}, {quickLng.toFixed(5)}</strong></span>
                  </div>
                ) : (
                  <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{quickGpsError || 'Obteniendo coordenadas satelitales...'}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Fotos del Inmueble
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center bg-slate-50/50 hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    id="quick-visit-photos"
                    onChange={(e) => e.target.files && setQuickFiles(Array.from(e.target.files))}
                    className="hidden"
                  />
                  <label htmlFor="quick-visit-photos" className="cursor-pointer flex flex-col items-center gap-1">
                    <Camera className="w-5 h-5 text-slate-400" />
                    <span className="text-xs font-semibold text-blue-600 hover:underline">
                      Tomar foto con cámara o adjuntar
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {quickFiles.length > 0 ? `${quickFiles.length} foto(s) seleccionada(s)` : 'Opcional'}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Notas de Inspección & Medidas
                </label>
                <textarea
                  rows={3}
                  value={quickNotes}
                  onChange={(e) => setQuickNotes(e.target.value)}
                  placeholder="Detalles observados, metrajes, estado actual..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setQuickVisitLead(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!quickLat || !quickLng || savingQuickVisit}
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg font-semibold shadow-sm transition-colors"
                >
                  {savingQuickVisit ? 'Guardando Visita...' : 'Confirmar Visita Realizada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL CREAR LEAD --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">Registrar Nuevo Lead</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateLead} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nombre del Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Carlos Mendoza"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Teléfono *</label>
                  <input
                    type="tel"
                    required
                    placeholder="305-000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="cliente@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <div>
                  <label className="block text-xs font-semibold text-blue-900 uppercase mb-1 flex items-center gap-1">
                    <Share2 className="w-3.5 h-3.5 text-blue-600" />
                    Canal de Captación
                  </label>
                  <select
                    value={leadSource}
                    onChange={(e) => setLeadSource(e.target.value as LeadSource)}
                    className="w-full px-3 py-2 text-xs bg-white border border-blue-200 rounded-lg text-slate-800 font-medium"
                  >
                    <option value="meta_ads">Meta Ads (Facebook / IG)</option>
                    <option value="google_ads">Google Ads</option>
                    <option value="landing_page">Web / Formulario</option>
                    <option value="referido">Referido</option>
                    <option value="directo">WhatsApp Directo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-900 uppercase mb-1 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    Presupuesto Estimado
                  </label>
                  <select
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-blue-200 rounded-lg text-slate-800 font-medium"
                  >
                    <option value="<5k">Menor a $5,000</option>
                    <option value="5k-15k">$5,000 a $15,000</option>
                    <option value="15k-50k">$15,000 a $50,000</option>
                    <option value=">50k">Mayor a $50,000</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Tipo de Servicio *</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                  >
                    <option value="Remodelación de Baño">Remodelación de Baño</option>
                    <option value="Remodelación de Cocina">Remodelación de Cocina</option>
                    <option value="Instalación de Pisos">Instalación de Pisos</option>
                    <option value="Drywall & Pintura">Drywall & Pintura</option>
                    <option value="Plomería / Electricidad">Plomería / Electricidad</option>
                    <option value="Handyman General">Handyman General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Condado *</label>
                  <select
                    value={locationCounty}
                    onChange={(e) => setLocationCounty(e.target.value as County)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                  >
                    <option value="miami-dade">Miami-Dade</option>
                    <option value="broward">Broward</option>
                    <option value="palm beach">Palm Beach</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Zip Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="33101"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Coordinador</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="">Sin Asignar</option>
                    {coordinators.map((c) => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Dirección</label>
                <input
                  type="text"
                  placeholder="Calle, número, apto..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                >
                  Guardar Prospecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL EDITAR LEAD --- */}
      {editingLead && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-600" />
                Editar Prospecto: {editingLead.client_name}
              </h3>
              <button onClick={() => setEditingLead(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateLead} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Teléfono *</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Correo</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Canal de Origen</label>
                  <select
                    value={editLeadSource}
                    onChange={(e) => setEditLeadSource(e.target.value as LeadSource)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="meta_ads">Meta Ads</option>
                    <option value="google_ads">Google Ads</option>
                    <option value="landing_page">Web / Form</option>
                    <option value="referido">Referido</option>
                    <option value="directo">Directo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Presupuesto</label>
                  <select
                    value={editBudgetRange}
                    onChange={(e) => setEditBudgetRange(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="<5k">&lt; $5k</option>
                    <option value="5k-15k">$5k - $15k</option>
                    <option value="15k-50k">$15k - $50k</option>
                    <option value=">50k">&gt; $50k</option>
                    <option value="no_especificado">No especificado</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm"
                >
                  Actualizar Prospecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIRMAR ELIMINACIÓN --- */}
      <ConfirmModal
        isOpen={Boolean(leadToDelete)}
        title="¿Eliminar este prospecto?"
        message={`Estás a punto de eliminar el registro de "${leadToDelete?.client_name}". Esta acción no se puede deshacer.`}
        confirmText="Sí, eliminar"
        cancelText="No, conservar"
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteLead}
        onCancel={() => setLeadToDelete(null)}
      />
    </AppLayout>
  );
}