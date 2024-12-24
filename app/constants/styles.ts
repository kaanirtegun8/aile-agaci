export const colors = {
  background: '#F5F7FA',    // Açık gri-mavi arka plan
  surface: '#FFFFFF',       // Beyaz yüzey
  primary: '#4A90E2',      // Ana mavi
  text: '#2C3E50',         // Koyu gri-mavi metin
  textLight: '#7F8C8D',    // Açık gri metin
  border: '#E8ECF0',       // Hafif gri kenarlıklar
  error: '#FF3B30',        // Hata/silme kırmızısı
  success: '#4CD964'       // Başarı yeşili
};

export const globalStyles = {
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    placeholderTextColor: colors.textLight,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  }
};

const styles = { colors, globalStyles };
export default styles; 