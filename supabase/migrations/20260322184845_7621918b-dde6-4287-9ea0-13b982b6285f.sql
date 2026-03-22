
-- Update the handle_new_user function to get phone from metadata or phone field
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_phone TEXT;
BEGIN
  -- Get phone from phone field or user_metadata
  user_phone := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone');
  
  IF user_phone IS NOT NULL AND user_phone != '' THEN
    INSERT INTO public.profiles (user_id, phone)
    VALUES (NEW.id, user_phone)
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.wallets (user_id, balance)
    VALUES (NEW.id, 1000)
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO public.transactions (user_id, type, amount, description)
    VALUES (NEW.id, 'credit', 1000, 'Welcome bonus');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
