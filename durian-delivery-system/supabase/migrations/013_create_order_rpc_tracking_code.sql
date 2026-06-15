create or replace function public.create_order_with_items(
  p_customer_name text,
  p_whatsapp_number text,
  p_delivery_address text,
  p_delivery_date date,
  p_delivery_time_type text,
  p_preferred_delivery_time text,
  p_notes text,
  p_product_subtotal integer,
  p_delivery_fee integer,
  p_total_amount integer,
  p_tracking_token text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_tracking_code text;
  v_item jsonb;
begin
  insert into public.orders (
    customer_name,
    whatsapp_number,
    delivery_address,
    delivery_date,
    delivery_time_type,
    preferred_delivery_time,
    notes,
    product_subtotal,
    delivery_fee,
    total_amount,
    tracking_token,
    status,
    payment_method
  )
  values (
    p_customer_name,
    p_whatsapp_number,
    p_delivery_address,
    p_delivery_date,
    p_delivery_time_type,
    p_preferred_delivery_time,
    p_notes,
    p_product_subtotal,
    p_delivery_fee,
    p_total_amount,
    p_tracking_token,
    'new',
    'cod'
  )
  returning id into v_order_id;

  select tracking_code
  into v_tracking_code
  from public.orders
  where id = v_order_id;

  for v_item in select value from jsonb_array_elements(p_items) as value
  loop
    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      unit_price,
      quantity,
      line_subtotal
    )
    values (
      v_order_id,
      v_item->>'product_id',
      v_item->>'product_name',
      (v_item->>'unit_price')::integer,
      (v_item->>'quantity')::integer,
      (v_item->>'line_subtotal')::integer
    );
  end loop;

  return jsonb_build_object(
    'order_id', v_order_id,
    'tracking_token', p_tracking_token,
    'tracking_code', v_tracking_code
  );
end;
$$;

revoke all on function public.create_order_with_items(
  text, text, text, date, text, text, text, integer, integer, integer, text, jsonb
) from public;

grant execute on function public.create_order_with_items(
  text, text, text, date, text, text, text, integer, integer, integer, text, jsonb
) to anon;
