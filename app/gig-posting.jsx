import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import BottomNav from "../components/BottomNav";
import { useAppAlert } from "../components/useAppAlert";
import { createGig } from "../api";

// GigMatch — Gig Posting (create a listing) — saves to POST /api/gigs
// Route: app/gig-posting.jsx  →  "/gig-posting"
//
// Used by clients ("looking for musicians" — with event date/time, venue and
// the grouped Venue / For the band / Music & style / Event details cards)
// and by bands/musicians (advertising availability — no event date; Band
// Includes and Client Requirements come as organized grouped cards).
// The form's extra details (duration, genres, included, requirements, fee
// terms) are packed into the gig description, since the gigs table only
// stores title/description/location/date/pay.

const GIG_TYPES = [
  "Birthday", "Wedding", "Concert", "Festival",
  "Corporate Event", "School Event", "Private Event", "Bar / Restaurant",
];

// Client "Post a gig" event types (client form only)
const CLIENT_EVENT_TYPES = [
  "Birthday", "Wedding", "Debut", "Fiesta", "Company Event",
  "Concert", "Corporate Event", "School Event", "Private Event", "Bar / Restaurant",
];

// Client form: "Performance duration / number of sets"
const SET_DURATION_OPTIONS = [
  "1 set", "2 sets", "3 sets", "4+ sets",
  "1 hour", "2 hours", "3 hours", "4+ hours",
];

const GENRES = [
  "OPM", "Pop", "Pop Rock", "Pinoy Rock", "Alternative Rock", "Indie Rock",
  "Acoustic", "R&B", "Soul", "Funk", "Jazz", "Blues", "Reggae", "Punk Rock",
  "Hard Rock", "Heavy Metal", "Folk", "Country", "Hip-Hop", "Rap", "Ballad",
  "Disco", "Dance", "Gospel", "Bossa Nova", "Latin", "Manila Sound",
  "Kundiman", "Novelty", "Christian Music",
];

const BARANGAYS = [
  "Apokon", "Babu Pangir", "Busaon", "Canocotan", "Cuambogan", "La Filipina",
  "Liboganon", "Madaum", "Magdum", "Magugpo Pob", "Magugpo East",
  "Magugpo North", "Magugpo South", "Magugpo West", "Mankilam",
  "New Balamban", "Nueva Fuerza", "Pagsabangan", "Pandapan", "San Agustin",
  "San Isidro", "San Miguel", "Visayan Village",
];

const DURATIONS = ["1 hour", "2 hours", "3 hours", "4 hours", "5+ hours"];

// What the band / musician brings to the gig ("Band Includes"), grouped into
// small labeled sections so the picker reads as one organized card instead of
// a single long chip cloud.
const INCLUDED_GROUPS = [
  {
    label: "Performance",
    options: ["Live Performance", "3 Sets", "2 Sets", "Song Requests", "Custom Setlist"],
  },
  {
    label: "Music",
    options: [
      "Cover Songs", "Original Songs", "Background Music",
      "Audience Interaction", "MC / Hosting",
    ],
  },
  {
    label: "Equipment & sound",
    options: ["Basic Sound Equipment", "Microphones", "Amplifiers", "Sound Check"],
  },
];

// What the band / musician needs from the client ("Client Requirements"),
// grouped the same way.
const REQUIREMENT_GROUPS = [
  {
    label: "Venue",
    options: ["Stage / Performance Area", "Chairs for Band Members", "Sound Check Time", "Setup Time"],
  },
  {
    label: "Utilities & sound",
    options: [
      "Stable Electricity", "Power Outlets",
      "Sound System (if not provided by band)",
      "Microphones (if not included)", "Drinking Water",
    ],
  },
  {
    label: "Hospitality",
    options: ["Meals / Snacks", "Parking Space", "Transportation", "Accommodation (for out-of-town gigs)"],
  },
];

const DESCRIPTION_MAX = 255;

// Strips everything but digits (so pasted text, letters, symbols, extra
// decimal points, etc. can never end up in the fee) and drops leading
// zeros like "007" -> "7".
function digitsOnly(value) {
  return value.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
}

// Renders a raw digit string as "₱5,000". Empty input renders as "".
function formatPeso(rawDigits) {
  if (!rawDigits) return "";
  return `₱${Number(rawDigits).toLocaleString("en-PH")}`;
}

// Renders a Date's time of day as "6:00 PM".
function formatTime(d) {
  if (!d) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function GigPosting() {
  const router = useRouter();
  const { fullName, instruments, genres, bandName, bandPhotoUri, role } = useLocalSearchParams();
  const isClient = role === "client" || role === "organizer";
  const homePath = isClient ? "/dashboard-client" : bandName ? "/dashboard-band" : "/dashboard-musician";
  const { showAlert, AlertModal } = useAppAlert();

  const [gigType, setGigType] = useState(null);
  const [eventDate, setEventDate] = useState(null); // JS Date chosen in the picker
  const [dateOpen, setDateOpen] = useState(false);
  const [barangay, setBarangay] = useState(null);
  const [duration, setDuration] = useState(null);
  const [genreTags, setGenreTags] = useState([]);
  const [description, setDescription] = useState("");
  const [startingFee, setStartingFee] = useState(""); // raw digits only, e.g. "5000"
  const [negotiable, setNegotiable] = useState(true);
  const [included, setIncluded] = useState([]);
  const [clientRequirements, setClientRequirements] = useState([]);
  const [portfolioPhotos, setPortfolioPhotos] = useState([]);
  const [posting, setPosting] = useState(false);

  // --- Client form only -------------------------------------------------
  const [startTime, setStartTime] = useState(null); // JS Date (time of day)
  const [endTime, setEndTime] = useState(null);
  const [venue, setVenue] = useState("");
  const [soundSystem, setSoundSystem] = useState(null);         // Provided | Not Provided
  const [songRequests, setSongRequests] = useState(null);       // Yes | No
  const [meals, setMeals] = useState(null);                     // Provided | Not Provided
  const [transportation, setTransportation] = useState(null);   // Provided | Not Provided
  const [stage, setStage] = useState(null);                     // Available | Not Available
  const [dressCode, setDressCode] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  // Only start showing field errors after the user has tried to post once,
  // so the form isn't red before they've touched anything.
  const [submitted, setSubmitted] = useState(false);

  const handleStartingFeeChange = (value) => {
    setStartingFee(digitsOnly(value));
  };

  const [gigTypeModalOpen, setGigTypeModalOpen] = useState(false);
  const [barangayModalOpen, setBarangayModalOpen] = useState(false);
  const [durationModalOpen, setDurationModalOpen] = useState(false);
  const [genreModalOpen, setGenreModalOpen] = useState(false);

  const toggleGenreTag = (item) => {
    setGenreTags((prev) => (prev.includes(item) ? prev.filter((t) => t !== item) : [...prev, item]));
  };
  const toggleIncluded = (item) => {
    setIncluded((prev) => (prev.includes(item) ? prev.filter((t) => t !== item) : [...prev, item]));
  };
  const toggleClientRequirement = (item) => {
    setClientRequirements((prev) => (prev.includes(item) ? prev.filter((t) => t !== item) : [...prev, item]));
  };

  const addPortfolioPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert({
        icon: "image",
        tone: "warning",
        title: "Permission needed",
        message: "GigMatch needs access to your photos to attach portfolio images.",
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length) {
      setPortfolioPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removePortfolioPhoto = (uri) => {
    setPortfolioPhotos((prev) => prev.filter((p) => p !== uri));
  };

  const errors = isClient
    ? {
        gigType: gigType === null ? "Select an event type." : null,
        eventDate: eventDate === null ? "Select an event date." : null,
        startTime: startTime === null ? "Select a start time." : null,
        venue: venue.trim().length === 0 ? "Venue / location is required." : null,
        duration: duration === null ? "Select a duration or number of sets." : null,
        genreTags: genreTags.length === 0 ? "Add at least one genre." : null,
        description: description.trim().length === 0 ? "Description is required." : null,
        startingFee:
          startingFee.length === 0
            ? "Budget is required."
            : Number(startingFee) <= 0
            ? "Budget must be greater than ₱0."
            : null,
        soundSystem: soundSystem === null ? "Select Provided or Not Provided." : null,
        songRequests: songRequests === null ? "Select Yes or No." : null,
        meals: meals === null ? "Select Provided or Not Provided." : null,
        transportation: transportation === null ? "Select Provided or Not Provided." : null,
        stage: stage === null ? "Select Available or Not Available." : null,
      }
    : {
        gigType: gigType === null ? "Select a gig type." : null,
        // No event date on a band's availability post — clients pick the date
        barangay: barangay === null ? "Select a location." : null,
        duration: duration === null ? "Select a performance duration." : null,
        genreTags: genreTags.length === 0 ? "Add at least one genre tag." : null,
        description:
          description.trim().length === 0 ? "Description is required." : null,
        startingFee:
          startingFee.length === 0
            ? "Starting fee is required."
            : Number(startingFee) <= 0
            ? "Starting fee must be greater than ₱0."
            : null,
      };
  const canPost = Object.values(errors).every((e) => e === null);

  const handlePost = async () => {
    setSubmitted(true);
    if (!canPost) {
      showAlert({
        icon: "alert-circle",
        tone: "warning",
        title: "Almost there",
        message: "Some fields need your attention — check the highlighted fields below.",
      });
      return;
    }
    if (posting) return;
    setPosting(true);
    try {
      // The gigs table stores title/description/location/date/pay, so the
      // form's extra details ride along inside the description.
      // The client form's start time is folded into the gig's datetime.
      let gigDate = eventDate ? new Date(eventDate) : null;
      if (gigDate && startTime) {
        gigDate.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
      }

      let gigDescription;
      if (isClient) {
        const clientLines = [
          startTime
            ? `Time: ${formatTime(startTime)}${endTime ? ` – ${formatTime(endTime)}` : ""}`
            : null,
          duration ? `Duration / sets: ${duration}` : null,
          genreTags.length ? `Genres: ${genreTags.join(", ")}` : null,
          `Budget: ${formatPeso(startingFee)} ${negotiable ? "(negotiable)" : "(fixed)"}`,
          soundSystem ? `Sound system: ${soundSystem}` : null,
          songRequests ? `Song requests: ${songRequests}` : null,
          meals ? `Meals / food: ${meals}` : null,
          transportation ? `Transportation: ${transportation}` : null,
          stage ? `Stage / performance area: ${stage}` : null,
          dressCode.trim() ? `Dress code: ${dressCode.trim()}` : null,
          specialRequests.trim() ? `Special requests: ${specialRequests.trim()}` : null,
        ].filter(Boolean);
        gigDescription = `${description.trim()}\n\n${clientLines.join("\n")}`;
      } else {
        const bandLines = [
          `Duration: ${duration}`,
          genreTags.length ? `Genres: ${genreTags.join(", ")}` : null,
          included.length ? `Band includes: ${included.join(", ")}` : null,
          clientRequirements.length
            ? `Client requirements: ${clientRequirements.join(", ")}`
            : null,
          `Fee: ${formatPeso(startingFee)} ${negotiable ? "(negotiable)" : "(fixed)"}`,
        ].filter(Boolean);
        gigDescription = `${description.trim()}\n\n${bandLines.join("\n")}`;
      }

      await createGig({
        title: gigType,
        description: gigDescription,
        location: isClient ? venue.trim() : barangay,
        date: gigDate ? gigDate.toISOString() : null,
        pay: startingFee, // raw digits, e.g. "5000"
      });

      showAlert({
        icon: "checkmark-circle",
        tone: "success",
        title: "Gig posted",
        message: "Musicians and bands can now find your gig and apply.",
        buttons: [
          {
            label: "Back to dashboard",
            onPress: () =>
              router.replace({
                pathname: homePath,
                params: { fullName, instruments, genres, bandName, bandPhotoUri, role },
              }),
          },
        ],
      });
    } catch (e) {
      showAlert({
        icon: "alert-circle",
        tone: "warning",
        title: "Couldn't post your gig",
        message: e.message || "Something went wrong. Please try again.",
      });
    } finally {
      setPosting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobPink]} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Post a gig</Text>
        <Text style={styles.subtitle}>
          {isClient ? "Tell bands and musicians about your event." : `Let clients know ${bandName ? bandName : "you're"} available for an event.`}
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>{isClient ? "Event Type" : "Gig type"}</Text>
          <Pressable
            onPress={() => setGigTypeModalOpen(true)}
            style={[styles.dropdownField, submitted && errors.gigType && styles.fieldError]}
          >
            <Text style={gigType ? styles.dropdownValue : styles.dropdownPlaceholder}>
              {gigType ?? (isClient ? "Select event type" : "Select gig type")}
            </Text>
            <Text style={styles.chevron}>⌄</Text>
          </Pressable>
          {submitted && errors.gigType ? (
            <Text style={styles.errorText}>{errors.gigType}</Text>
          ) : null}
        </View>

        {/* Event date — client events only (a band's availability post has no date) */}
        {isClient ? (
          <View style={styles.field}>
            <Text style={styles.label}>Event date</Text>
            <Pressable
              onPress={() => setDateOpen((v) => !v)}
              style={[styles.dropdownField, submitted && errors.eventDate && styles.fieldError]}
            >
              <Text style={eventDate ? styles.dropdownValue : styles.dropdownPlaceholder}>
                {eventDate
                  ? eventDate.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Select date"}
              </Text>
              <Ionicons name="calendar-outline" size={16} color="#6b7280" />
            </Pressable>
            {dateOpen ? (
              <View style={styles.datePickerWrap}>
                <DateTimePicker
                  value={eventDate ?? new Date()}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date()}
                  onChange={(_, selected) => {
                    if (selected) setEventDate(selected);
                  }}
                  style={styles.datePicker}
                />
                <Pressable onPress={() => setDateOpen(false)} style={styles.dateDoneButton}>
                  <Text style={styles.dateDoneText}>Done</Text>
                </Pressable>
              </View>
            ) : null}
            {submitted && errors.eventDate ? (
              <Text style={styles.errorText}>{errors.eventDate}</Text>
            ) : null}
          </View>
        ) : null}

        {/* Client: start + end time */}
        {isClient ? (
          <View style={styles.timeRow}>
            <TimeField
              label="Start time"
              value={startTime}
              onChange={setStartTime}
              submitted={submitted}
              error={errors.startTime}
              style={styles.timeHalf}
            />
            <TimeField
              label="End time"
              value={endTime}
              onChange={setEndTime}
              submitted={submitted}
              error={null}
              style={styles.timeHalf}
            />
          </View>
        ) : null}

        {isClient ? (
          <View style={styles.field}>
            <Text style={styles.label}>Venue / Location</Text>
            <TextInput
              value={venue}
              onChangeText={setVenue}
              placeholder="e.g. Christ the King Hall, Cuambogan"
              placeholderTextColor="#9ca3af"
              maxLength={120}
              style={[styles.input, styles.inputTight, submitted && errors.venue && styles.fieldError]}
            />
            {submitted && errors.venue ? (
              <Text style={styles.errorText}>{errors.venue}</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.field}>
            <Text style={styles.label}>Location</Text>
            <Pressable
              onPress={() => setBarangayModalOpen(true)}
              style={[styles.dropdownField, submitted && errors.barangay && styles.fieldError]}
            >
              <Text style={barangay ? styles.dropdownValue : styles.dropdownPlaceholder}>
                {barangay ?? "Select barangay"}
              </Text>
              <Text style={styles.chevron}>⌄</Text>
            </Pressable>
            {submitted && errors.barangay ? (
              <Text style={styles.errorText}>{errors.barangay}</Text>
            ) : null}
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>
            {isClient ? "Performance duration / number of sets" : "Performance duration"}
          </Text>
          <Pressable
            onPress={() => setDurationModalOpen(true)}
            style={[styles.dropdownField, submitted && errors.duration && styles.fieldError]}
          >
            <Text style={duration ? styles.dropdownValue : styles.dropdownPlaceholder}>
              {duration ?? (isClient ? "Select duration / sets" : "Select duration")}
            </Text>
            <Text style={styles.chevron}>⌄</Text>
          </Pressable>
          {submitted && errors.duration ? (
            <Text style={styles.errorText}>{errors.duration}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{isClient ? "Music genre" : "Genre tags"}</Text>
          <View style={styles.chipRow}>
            {genreTags.map((tag) => (
              <Pressable key={tag} onPress={() => toggleGenreTag(tag)} style={styles.chipSelected}>
                <Text style={styles.chipSelectedText}>{tag}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setGenreModalOpen(true)} style={styles.chipAdd}>
              <Text style={styles.chipAddText}>+ Add</Text>
            </Pressable>
          </View>
          {submitted && errors.genreTags ? (
            <Text style={styles.errorText}>{errors.genreTags}</Text>
          ) : null}
        </View>

        {!isClient ? (
          <DescriptionField
            label="Description"
            description={description}
            onChange={setDescription}
            submitted={submitted}
            error={errors.description}
          />
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>{isClient ? "Budget / talent fee" : "Starting fee"}</Text>
          <TextInput
            value={formatPeso(startingFee)}
            onChangeText={handleStartingFeeChange}
            placeholder="e.g. ₱5,000"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            style={[styles.input, submitted && errors.startingFee && styles.fieldError]}
          />
          {submitted && errors.startingFee ? (
            <Text style={styles.errorText}>{errors.startingFee}</Text>
          ) : null}
          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => setNegotiable(true)}
              style={[styles.toggleOption, negotiable && styles.toggleOptionActive]}
            >
              <Text style={[styles.toggleOptionText, negotiable && styles.toggleOptionTextActive]}>Negotiable</Text>
            </Pressable>
            <Pressable
              onPress={() => setNegotiable(false)}
              style={[styles.toggleOption, !negotiable && styles.toggleOptionActive]}
            >
              <Text style={[styles.toggleOptionText, !negotiable && styles.toggleOptionTextActive]}>Not negotiable</Text>
            </Pressable>
          </View>
        </View>

        {!isClient ? (
          <>
        <SectionCard
          icon="musical-notes-outline"
          title="Band Includes"
          hint="What you'll bring to the gig"
          count={included.length}
        >
          {INCLUDED_GROUPS.map((group) => (
            <OptionGroup
              key={group.label}
              label={group.label}
              options={group.options}
              selected={included}
              onToggle={toggleIncluded}
            />
          ))}
        </SectionCard>

        <SectionCard
          icon="clipboard-outline"
          title="Client Requirements"
          hint="What you need from the client"
          count={clientRequirements.length}
        >
          {REQUIREMENT_GROUPS.map((group) => (
            <OptionGroup
              key={group.label}
              label={group.label}
              options={group.options}
              selected={clientRequirements}
              onToggle={toggleClientRequirement}
            />
          ))}
        </SectionCard>

        <View style={styles.field}>
          <Text style={styles.label}>Portfolio (band)</Text>
          <View style={styles.portfolioRow}>
            {portfolioPhotos.map((uri) => (
              <View key={uri} style={styles.portfolioThumbWrap}>
                <Image source={{ uri }} style={styles.portfolioThumb} />
                <Pressable
                  onPress={() => removePortfolioPhoto(uri)}
                  style={styles.portfolioRemove}
                  hitSlop={6}
                >
                  <Ionicons name="close" size={12} color="#fff" />
                </Pressable>
              </View>
            ))}
            <Pressable onPress={addPortfolioPhoto} style={styles.portfolioAddButton}>
              <Ionicons name="add" size={20} color="#7c3aed" />
            </Pressable>
          </View>
        </View>
          </>
        ) : (
          <>
            {/* Venue & equipment */}
            <SectionCard
              icon="business-outline"
              title="Venue & equipment"
              hint="What's available for the band on the day"
            >
              <ChoiceField
                icon="volume-high-outline"
                label="Sound system"
                value={soundSystem}
                options={["Provided", "Not Provided"]}
                onChange={setSoundSystem}
                submitted={submitted}
                error={errors.soundSystem}
              />
              <ChoiceField
                icon="mic-outline"
                label="Stage / performance area"
                value={stage}
                options={["Available", "Not Available"]}
                onChange={setStage}
                submitted={submitted}
                error={errors.stage}
                last
              />
            </SectionCard>

            {/* For the band */}
            <SectionCard
              icon="people-outline"
              title="For the band"
              hint="How you'll take care of the performers"
            >
              <ChoiceField
                icon="fast-food-outline"
                label="Meals / food"
                value={meals}
                options={["Provided", "Not Provided"]}
                onChange={setMeals}
                submitted={submitted}
                error={errors.meals}
              />
              <ChoiceField
                icon="car-outline"
                label="Transportation"
                value={transportation}
                options={["Provided", "Not Provided"]}
                onChange={setTransportation}
                submitted={submitted}
                error={errors.transportation}
                last
              />
            </SectionCard>

            {/* Music & style */}
            <SectionCard
              icon="sparkles-outline"
              title="Music & style"
              hint="Requests, vibe and how the band should dress"
            >
              <ChoiceField
                icon="headset-outline"
                label="Song requests"
                value={songRequests}
                options={["Yes", "No"]}
                onChange={setSongRequests}
                submitted={submitted}
                error={errors.songRequests}
              />
              <View style={[styles.choiceField, styles.choiceFieldLast]}>
                <View style={styles.choiceLabelRow}>
                  <Ionicons name="shirt-outline" size={15} color="#6b7280" />
                  <Text style={styles.choiceLabel}>
                    Dress code <Text style={styles.optionalText}>(optional)</Text>
                  </Text>
                </View>
                <TextInput
                  value={dressCode}
                  onChangeText={setDressCode}
                  placeholder="e.g. Formal attire"
                  placeholderTextColor="#9ca3af"
                  maxLength={80}
                  style={[styles.input, styles.inputTight]}
                />
              </View>
            </SectionCard>

            {/* Event details */}
            <SectionCard
              icon="document-text-outline"
              title="Event details"
              hint="Special requests and the event description"
            >
              <View style={styles.choiceField}>
                <View style={styles.choiceLabelRow}>
                  <Ionicons name="chatbox-ellipses-outline" size={15} color="#6b7280" />
                  <Text style={styles.choiceLabel}>Special requirements / requests</Text>
                </View>
                <TextInput
                  value={specialRequests}
                  onChangeText={(v) => setSpecialRequests(v.slice(0, 200))}
                  placeholder="Anything else the band should know..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  maxLength={200}
                  style={[styles.textarea, { minHeight: 70 }]}
                />
              </View>
              <DescriptionField
                label="Event description"
                description={description}
                onChange={setDescription}
                submitted={submitted}
                error={errors.description}
                last
              />
            </SectionCard>
          </>
        )}

        <Pressable onPress={handlePost} style={({ pressed }) => [pressed && canPost && !posting && styles.pressed]}>
          <LinearGradient
            colors={canPost && !posting ? ["#8b5cf6", "#d946ef"] : ["#e5e0f5", "#e5e0f5"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.postButton}
          >
            <Text style={[styles.postButtonText, (!canPost || posting) && styles.postButtonTextDisabled]}>
              {posting ? "Posting…" : "Post gig"}
            </Text>
          </LinearGradient>
        </Pressable>

        <View style={{ height: 100 }} />
      </ScrollView>
        <BottomNav
          homeRoute={homePath}
          profileRoute="/profile-musician"
          params={{ fullName, instruments, genres, bandName, bandPhotoUri, role }}
          showGigs={!!bandName}
        />

      <SelectModal
        visible={gigTypeModalOpen}
        title={isClient ? "Event type" : "Gig type"}
        options={isClient ? CLIENT_EVENT_TYPES : GIG_TYPES}
        selected={gigType ? [gigType] : []}
        onSelect={(item) => { setGigType(item); setGigTypeModalOpen(false); }}
        onClose={() => setGigTypeModalOpen(false)}
      />
      <SelectModal
        visible={barangayModalOpen}
        title="Select barangay"
        options={BARANGAYS}
        selected={barangay ? [barangay] : []}
        onSelect={(item) => { setBarangay(item); setBarangayModalOpen(false); }}
        onClose={() => setBarangayModalOpen(false)}
      />
      <SelectModal
        visible={durationModalOpen}
        title={isClient ? "Performance duration / number of sets" : "Performance duration"}
        options={isClient ? SET_DURATION_OPTIONS : DURATIONS}
        selected={duration ? [duration] : []}
        onSelect={(item) => { setDuration(item); setDurationModalOpen(false); }}
        onClose={() => setDurationModalOpen(false)}
      />
      <SelectModal
        visible={genreModalOpen}
        title="Genre tags"
        options={GENRES}
        selected={genreTags}
        multiple
        onToggle={toggleGenreTag}
        onClose={() => setGenreModalOpen(false)}
      />

      {AlertModal}
    </KeyboardAvoidingView>
  );
}

function SelectModal({ visible, title, options, selected, multiple, onSelect, onToggle, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.modalClose}>✕</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.modalList}>
          {options.map((item) => {
            const isSelected = selected.includes(item);
            return (
              <Pressable key={item} onPress={() => (multiple ? onToggle(item) : onSelect(item))} style={styles.modalRow}>
                <Text style={styles.modalRowText}>{item}</Text>
                {isSelected ? <Text style={styles.modalCheck}>✓</Text> : null}
              </Pressable>
            );
          })}
        </ScrollView>
        {multiple ? (
          <Pressable onPress={onClose} style={styles.modalDoneButtonWrap}>
            <LinearGradient colors={["#8b5cf6", "#d946ef"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalDoneButton}>
              <Text style={styles.modalDoneText}>Done</Text>
            </LinearGradient>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}

// Labelled description textarea (rendered once per role — the client form
// places it last inside the "Event details" card, the band form puts it
// after the genres)
function DescriptionField({ label, description, onChange, submitted, error, last }) {
  return (
    <View style={[styles.field, last && styles.fieldLast]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={description}
        onChangeText={(v) => onChange(v.slice(0, DESCRIPTION_MAX))}
        placeholder="What kind of event, what you'll bring..."
        placeholderTextColor="#9ca3af"
        multiline
        maxLength={DESCRIPTION_MAX}
        style={[styles.textarea, submitted && error && styles.fieldError]}
      />
      <Text style={styles.charCount}>
        {description.length}/{DESCRIPTION_MAX}
      </Text>
      {submitted && error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// Client form: start / end time — press to open an inline spinner + Done
function TimeField({ label, value, onChange, submitted, error, style }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={[styles.dropdownField, submitted && error && styles.fieldError]}
      >
        <Text style={value ? styles.dropdownValue : styles.dropdownPlaceholder}>
          {value ? formatTime(value) : "Select time"}
        </Text>
        <Ionicons name="time-outline" size={16} color="#6b7280" />
      </Pressable>
      {open ? (
        <View style={styles.datePickerWrap}>
          <DateTimePicker
            value={value ?? new Date()}
            mode="time"
            display="spinner"
            onChange={(_, picked) => {
              if (picked) onChange(picked);
            }}
            style={styles.datePicker}
          />
          <Pressable onPress={() => setOpen(false)} style={styles.dateDoneButton}>
            <Text style={styles.dateDoneText}>Done</Text>
          </Pressable>
        </View>
      ) : null}
      {submitted && error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// Client form: icon + label, then a segmented pill row (Provided / Not
// Provided, Yes / No, ...) — the selected pill shows a checkmark.
function ChoiceField({ icon, label, value, options, onChange, submitted, error, last }) {
  return (
    <View style={[styles.choiceField, last && styles.choiceFieldLast]}>
      <View style={styles.choiceLabelRow}>
        {icon ? <Ionicons name={icon} size={15} color="#6b7280" /> : null}
        <Text style={styles.choiceLabel}>{label}</Text>
      </View>
      <View style={styles.toggleRow}>
        {options.map((opt) => {
          const active = value === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(active ? null : opt)}
              style={[styles.toggleOption, active && styles.toggleOptionActive]}
            >
              {active ? <Ionicons name="checkmark-circle" size={14} color={PURPLE} /> : null}
              <Text style={[styles.toggleOptionText, active && styles.toggleOptionTextActive]}>
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {submitted && error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// Organized form section: white card with a purple icon, title, optional
// hint and an optional "n selected" badge. Used for the band form's
// Band Includes / Client Requirements and the client form's grouped fields.
function SectionCard({ icon, title, hint, count, children }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionIconWrap}>
          <Ionicons name={icon} size={16} color={PURPLE} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
        </View>
        {typeof count === "number" ? (
          <View style={styles.sectionCount}>
            <Text style={styles.sectionCountText}>{count} selected</Text>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

// A labeled group of chips inside a SectionCard (e.g. Performance / Music /
// Equipment & sound under "Band Includes") — selected chips turn purple with
// a checkmark.
function OptionGroup({ label, options, selected, onToggle }) {
  return (
    <View style={styles.optionGroup}>
      <Text style={styles.optionGroupLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((item) => {
          const isSelected = selected.includes(item);
          return (
            <Pressable
              key={item}
              onPress={() => onToggle(item)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              {isSelected ? <Ionicons name="checkmark-circle" size={13} color={PURPLE} /> : null}
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const PURPLE = "#7c3aed";

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f7fb" },
  blob: { position: "absolute", borderRadius: 9999, opacity: 0.2 },
  blobViolet: { top: -60, left: -60, height: 220, width: 220, backgroundColor: "#c4b5fd" },
  blobPink: { top: 260, right: -80, height: 220, width: 220, backgroundColor: "#f5d0fe" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },

  title: { color: "#111827", fontSize: 22, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: "#6b7280", fontSize: 13, lineHeight: 19, marginBottom: 22 },

  field: { marginBottom: 18 },
  label: { color: "#111827", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827",
    marginBottom: 10,
  },
  textarea: {
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12, padding: 14, fontSize: 14, color: "#111827", minHeight: 90, textAlignVertical: "top",
  },
  charCount: { color: "#9ca3af", fontSize: 11, marginTop: 4, textAlign: "right" },
  fieldError: { borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.05)" },
  errorText: { color: "#ef4444", fontSize: 12, marginTop: 6 },
  fieldLast: { marginBottom: 0 },

  // --- Organized section cards (Band Includes / client form groups) ------
  sectionCard: {
    backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 18, borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)", padding: 16, marginBottom: 18,
  },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  sectionIconWrap: {
    height: 32, width: 32, borderRadius: 16, backgroundColor: "rgba(124,58,237,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  sectionTitle: { color: "#111827", fontSize: 14, fontWeight: "700" },
  sectionHint: { color: "#9ca3af", fontSize: 11, marginTop: 1 },
  sectionCount: {
    backgroundColor: "rgba(124,58,237,0.1)", borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  sectionCountText: { color: PURPLE, fontSize: 10.5, fontWeight: "700" },

  optionGroup: { marginBottom: 14 },
  optionGroupLabel: {
    color: "#9ca3af", fontSize: 10.5, fontWeight: "700", letterSpacing: 0.6,
    textTransform: "uppercase", marginBottom: 8,
  },

  // Fields inside a section card
  choiceField: { marginBottom: 14 },
  choiceFieldLast: { marginBottom: 0 },
  choiceLabelRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  choiceLabel: { color: "#111827", fontSize: 13, fontWeight: "600" },
  optionalText: { color: "#9ca3af", fontSize: 12 },

  dropdownField: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
  },
  dropdownValue: { color: "#111827", fontSize: 14 },
  dropdownPlaceholder: { color: "#9ca3af", fontSize: 14 },
  chevron: { color: "#6b7280", fontSize: 16 },

  timeRow: { flexDirection: "row", gap: 10 },
  timeHalf: { flex: 1 },
  inputTight: { marginBottom: 0 },

  datePickerWrap: {
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12, marginTop: 8, overflow: "hidden",
  },
  datePicker: { width: "100%" },
  dateDoneButton: {
    alignSelf: "flex-end", marginRight: 12, marginBottom: 12,
    backgroundColor: "rgba(124,58,237,0.1)", borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  dateDoneText: { color: PURPLE, fontSize: 12, fontWeight: "700" },

  toggleRow: { flexDirection: "row", gap: 10 },
  toggleOption: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12, paddingVertical: 12,
  },
  toggleOptionActive: { borderColor: PURPLE, backgroundColor: "rgba(124,58,237,0.1)" },
  toggleOptionText: { color: "#6b7280", fontSize: 13, fontWeight: "600" },
  toggleOptionTextActive: { color: PURPLE },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipSelected: {
    backgroundColor: "rgba(124,58,237,0.1)", borderColor: "rgba(124,58,237,0.45)",
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipSelectedText: { color: PURPLE, fontSize: 12, fontWeight: "600" },
  chipAdd: {
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipAddText: { color: "#374151", fontSize: 12, fontWeight: "500" },

  chip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipText: { color: "#374151", fontSize: 12, fontWeight: "600" },
  chipTextSelected: { color: PURPLE },

  portfolioRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  portfolioThumbWrap: { position: "relative" },
  portfolioThumb: { height: 64, width: 64, borderRadius: 12, backgroundColor: "rgba(124,58,237,0.1)" },
  portfolioRemove: {
    position: "absolute", top: -6, right: -6,
    height: 18, width: 18, borderRadius: 9,
    backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center",
  },
  portfolioAddButton: {
    height: 64, width: 64, borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(124,58,237,0.3)", borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },

  postButton: { marginTop: 10, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  postButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  postButtonTextDisabled: { color: "#a78bfa" },
  pressed: { opacity: 0.9 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "70%",
    backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  modalTitle: { color: "#111827", fontSize: 15, fontWeight: "700" },
  modalClose: { color: "#6b7280", fontSize: 16 },
  modalList: { maxHeight: 360 },
  modalRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  modalRowText: { color: "#111827", fontSize: 14 },
  modalCheck: { color: PURPLE, fontSize: 14, fontWeight: "700" },
  modalDoneButtonWrap: { marginTop: 14 },
  modalDoneButton: { borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  modalDoneText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});